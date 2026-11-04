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

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager em;

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

    /** A customer who forgot their password asks at the container; an owner sets a new one. Signs them out everywhere. */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void resetCustomerPassword(String actorEmail, UUID id, String password) {
        User user = customer(id);
        user.changePassword(encoder.encode(password));
        users.saveAndFlush(user);
        audit.record(actorEmail, "CUSTOMER_PASSWORD_RESET", "USER", id, null, Map.of("email", user.getEmail()));
    }

    /** Owners switch off a customer account (a spammer, a fake account) or switch it back on. */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public CustomerView setCustomerActive(String actorEmail, UUID id, boolean active) {
        User user = customer(id);
        boolean before = user.isActive();
        user.setActive(active);
        users.saveAndFlush(user);
        audit.record(actorEmail, "CUSTOMER_ACTIVE_CHANGED", "USER", id, Map.of("active", before), Map.of("active", active));
        return CustomerView.of(user);
    }

    /** Owners look customers up by email to mark trusted ones (the switch itself is in PricingAdminService). */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<CustomerView> customers(String search, int page, int size) {
        String text = "%" + (search == null ? "" : search.strip().toLowerCase(Locale.ROOT)).replace("%", "") + "%";
        Page<User> result = users.searchByRole(Role.CUSTOMER, text, PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100)));
        // What each one bought, in one query: paid and handed-over orders, their sum and the newest.
        Map<UUID, Object[]> bought = new HashMap<>();
        List<UUID> ids = result.getContent().stream().map(User::getId).toList();
        if (!ids.isEmpty()) {
            em.createQuery("select o.customer.id, count(o), sum(o.total), max(o.createdAt) from Order o where o.customer.id in :ids "
                            + "and o.status in (com.akven.thesis.order.OrderStatus.PAID, com.akven.thesis.order.OrderStatus.FULFILLED) group by o.customer.id", Object[].class)
                    .setParameter("ids", ids).getResultList().forEach(row -> bought.put((UUID) row[0], row));
        }
        return PageResponse.of(result, u -> {
            Object[] b = bought.get(u.getId());
            return b == null ? CustomerView.of(u) : CustomerView.of(u, (Long) b[1], (java.math.BigDecimal) b[2], (java.time.Instant) b[3]);
        });
    }

    /** The whole audit log, newest first: every change anyone made in the admin. */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public PageResponse<AuditView> auditLog(int page, int size) {
        return auditLog(null, null, page, size);
    }

    /** The parts of the shop a change can be about, so the log can be read one part at a time. */
    static final Map<String, List<String>> AREAS = Map.of(
            "orders", List.of("ORDER", "ORDER_EXPORT"),
            "catalog", List.of("PRODUCT", "VARIANT", "TERM"),
            "prices", List.of("PRICE_TIER", "SHOP_POLICY"),
            "delivery", List.of("DELIVERY_ZONE"),
            "people", List.of("USER"),
            "chat", List.of("NEGOTIATION_SESSION", "APP_SETTING"),
            "shop", List.of("SHOP_CONTACT", "PICKUP_POINT", "SIZE_CHART_ROW"),
            "messages", List.of("EMAIL", "STOCK_REQUEST", "REVIEW", "WHOLESALE_REQUEST"));

    /**
     * The audit log, newest first. area: one of {@link #AREAS} (null for all). who: "team" (staff, owners, super
     * admins), "customers", "guests" (no account), or one email (null for everyone).
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public PageResponse<AuditView> auditLog(String area, String who, int page, int size) {
        List<String> types = area == null ? null : AREAS.get(area);
        Set<UUID> team = users.findAll().stream().filter(u -> u.getRole() != Role.CUSTOMER).map(User::getId).collect(Collectors.toSet());
        org.springframework.data.jpa.domain.Specification<AuditLogEntry> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> all = new java.util.ArrayList<>();
            if (types != null) all.add(root.get("entityType").in(types));
            if ("guests".equals(who)) all.add(cb.isNull(root.get("actorId")));
            else if ("team".equals(who)) all.add(team.isEmpty() ? cb.disjunction() : root.get("actorId").in(team));
            else if ("customers".equals(who)) {
                all.add(cb.isNotNull(root.get("actorId")));
                if (!team.isEmpty()) all.add(cb.not(root.get("actorId").in(team)));
            } else if (who != null && !who.isBlank()) {
                all.add(cb.equal(root.get("actorId"), users.findByEmail(who.strip()).map(User::getId).orElse(new UUID(0, 0))));
            }
            return cb.and(all.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        Page<AuditLogEntry> result = auditLog.findAll(spec, PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100),
                Sort.by(Sort.Direction.DESC, "createdAt")));
        Map<UUID, User> actors = new HashMap<>();
        users.findAllById(result.stream().map(AuditLogEntry::getActorId).filter(java.util.Objects::nonNull).collect(Collectors.toSet()))
                .forEach(u -> actors.put(u.getId(), u));
        return PageResponse.of(result, e -> {
            User a = e.getActorId() == null ? null : actors.get(e.getActorId());
            return new AuditView(e.getId(), e.getCreatedAt(), e.getActorId() == null ? "guest" : a == null ? "?" : a.getEmail(),
                    e.getAction(), e.getEntityType(), e.getEntityId(), e.getBeforeState(), e.getAfterState(),
                    e.getActorId() == null ? "GUEST" : a == null ? null : a.getRole().name());
        });
    }

    /** A staff or owner account. Super admin accounts are never changed through the API. */
    private User teamMember(UUID id) {
        User user = users.findById(id).filter(u -> ASSIGNABLE.contains(u.getRole()))
                .orElseThrow(() -> new NotFoundException("Account not found."));
        return user;
    }

    private User customer(UUID id) {
        return users.findById(id).filter(u -> u.getRole() == Role.CUSTOMER)
                .orElseThrow(() -> new NotFoundException("Customer not found."));
    }

    private static void requireAssignable(Role role) {
        if (!ASSIGNABLE.contains(role)) throw new BusinessRuleException("An account can be staff or an owner.");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
