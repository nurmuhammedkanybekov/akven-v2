package com.akven.thesis.user;

import com.akven.thesis.audit.AuditLogEntry;
import com.akven.thesis.audit.AuditLogRepository;
import com.akven.thesis.audit.AuditService;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.ConflictException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.common.PageResponse;
import com.akven.thesis.user.AccountDtos.AccountView;
import com.akven.thesis.user.AccountDtos.AuditView;
import com.akven.thesis.user.AccountDtos.CreateAccount;
import com.akven.thesis.user.AccountDtos.CustomerView;
import com.akven.thesis.user.AccountDtos.UpdateAccount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * UC-9: the shop team's accounts. Only the super admin creates owners and staff, changes their role, disables them and
 * sets a new password; nobody can do that to a super admin account through the API, so the system can never be left
 * without one. Owners see the customers, to mark trusted ones. Every change is audited, and a disabled account or a new
 * password ends the sessions signed in before it (see JwtAuthenticationFilter).
 */
@Service
public class AccountService {

    private static final Set<Role> TEAM = EnumSet.of(Role.STAFF, Role.ADMIN, Role.SUPER_ADMIN);
    private static final Set<Role> ASSIGNABLE = EnumSet.of(Role.STAFF, Role.ADMIN);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuditService audit;
    private final AuditLogRepository auditLog;

    public AccountService(UserRepository users, PasswordEncoder encoder, AuditService audit, AuditLogRepository auditLog) {
        this.users = users;
        this.encoder = encoder;
        this.audit = audit;
        this.auditLog = auditLog;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public List<AccountView> team() {
        return users.findByRoleInOrderByRoleDescEmailAsc(TEAM).stream().map(AccountView::of).toList();
    }

    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public AccountView create(String actorEmail, CreateAccount r) {
        requireAssignable(r.role());
        String email = r.email().trim().toLowerCase(Locale.ROOT);
        if (users.findByEmail(email).isPresent()) throw new ConflictException("There is already an account with this email.");
        User user = new User(email, encoder.encode(r.password()), r.role());
        user.setDisplayName(blankToNull(r.displayName()));
        AccountView view = AccountView.of(users.saveAndFlush(user));
        audit.record(actorEmail, "ACCOUNT_CREATED", "USER", user.getId(), null, view);
        return view;
    }

    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public AccountView update(String actorEmail, UUID id, UpdateAccount r) {
        User user = teamMember(id);
        requireAssignable(r.role());
        AccountView before = AccountView.of(user);
        user.setDisplayName(blankToNull(r.displayName()));
        user.setRole(r.role());
        user.setActive(r.active());
        AccountView after = AccountView.of(users.saveAndFlush(user));
        audit.record(actorEmail, "ACCOUNT_UPDATED", "USER", id, before, after);
        return after;
    }

    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public void resetPassword(String actorEmail, UUID id, String password) {
        User user = teamMember(id);
        user.changePassword(encoder.encode(password));
        users.saveAndFlush(user);
        audit.record(actorEmail, "ACCOUNT_PASSWORD_RESET", "USER", id, null, Map.of("email", user.getEmail()));
    }

    /** Owners look customers up by email to mark trusted ones (the switch itself is in PricingAdminService). */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<CustomerView> customers(String search, int page, int size) {
        Page<User> result = users.findByRoleAndEmailContainingIgnoreCaseOrderByEmailAsc(Role.CUSTOMER, search == null ? "" : search.strip(),
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100)));
        return PageResponse.of(result, CustomerView::of);
    }

    /** The whole audit log, newest first: every change anyone made in the admin. */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public PageResponse<AuditView> auditLog(int page, int size) {
        Page<AuditLogEntry> result = auditLog.findAll(PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")));
        Map<UUID, String> emails = new HashMap<>();
        users.findAllById(result.stream().map(AuditLogEntry::getActorId).collect(Collectors.toSet()))
                .forEach(u -> emails.put(u.getId(), u.getEmail()));
        return PageResponse.of(result, e -> new AuditView(e.getId(), e.getCreatedAt(), emails.getOrDefault(e.getActorId(), "?"),
                e.getAction(), e.getEntityType(), e.getEntityId(), e.getBeforeState(), e.getAfterState()));
    }

    /** A staff or owner account. Super admin accounts are never changed through the API. */
    private User teamMember(UUID id) {
        User user = users.findById(id).filter(u -> ASSIGNABLE.contains(u.getRole()))
                .orElseThrow(() -> new NotFoundException("Account not found."));
        return user;
    }

    private static void requireAssignable(Role role) {
        if (!ASSIGNABLE.contains(role)) throw new BusinessRuleException("An account can be staff or an owner.");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
