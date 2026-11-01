package com.akven.thesis.wholesale;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.wholesale.WholesaleDtos.HandleInput;
import com.akven.thesis.wholesale.WholesaleDtos.Inbox;
import com.akven.thesis.wholesale.WholesaleDtos.InboxLine;
import com.akven.thesis.wholesale.WholesaleDtos.Received;
import com.akven.thesis.wholesale.WholesaleDtos.RequestInput;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Requests from shops and companies: written by anyone (no account needed), read and handled by the shop team.
 * Text is kept as plain text: control characters are dropped, runs of blank lines and spaces shortened. The contact is
 * checked against its kind, so the family can always answer: a phone number for WhatsApp and calls, a Telegram name
 * or number, an email address.
 */
@Service
public class WholesaleService {

    /** How many requests the inbox lists at once. */
    static final int SHOWN = 200;

    private static final Pattern PHONE = Pattern.compile("\\+?[0-9][0-9 ()-]{6,22}");
    private static final Pattern TELEGRAM = Pattern.compile("@?[A-Za-z][A-Za-z0-9_]{4,31}");
    private static final Pattern EMAIL = Pattern.compile("[^@\\s]{1,64}@[^@\\s]+\\.[^@\\s]{2,}");

    private final WholesaleRequestRepository requests;
    private final WholesaleRateLimiter limiter;
    private final AuditService audit;

    public WholesaleService(WholesaleRequestRepository requests, WholesaleRateLimiter limiter, AuditService audit) {
        this.requests = requests;
        this.limiter = limiter;
        this.audit = audit;
    }

    /** A short reference the customer can quote: the first eight characters of the id, in capitals. */
    static String reference(UUID id) {
        return "W-" + id.toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    @Transactional
    public Received submit(RequestInput in, String address, String accountEmail) {
        // The trap field: answer like a success, keep nothing, and do not spend the visitor's limit on it.
        if (in.website() != null && !in.website().isBlank()) {
            return new Received(reference(UUID.randomUUID()), Instant.now());
        }
        String company = line(in.company());
        if (company == null || company.length() < 2) throw new BusinessRuleException("Write the name of the shop or company.");
        String contact = contact(in.contactKind(), in.contact());
        limiter.check(address);
        WholesaleRequest r = new WholesaleRequest(in.kind(), company, line(in.city()), in.contactKind(), contact,
                in.pairs(), text(in.mix()), text(in.note()), accountEmail);
        requests.save(r);
        return new Received(reference(r.getId()), r.getCreatedAt());
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional(readOnly = true)
    public Inbox inbox(WholesaleStatus status) {
        PageRequest page = PageRequest.of(0, SHOWN);
        List<WholesaleRequest> list = status == null ? requests.findAllByOrderByCreatedAtDesc(page)
                : requests.findByStatusOrderByCreatedAtDesc(status, page);
        return new Inbox(requests.countByStatus(WholesaleStatus.NEW), list.stream().map(InboxLine::of).toList());
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional
    public InboxLine handle(String actorEmail, UUID id, HandleInput in) {
        WholesaleRequest r = requests.findById(id).orElseThrow(() -> new NotFoundException("No such request."));
        if (in.status() == WholesaleStatus.NEW && r.getStatus() != WholesaleStatus.NEW) {
            throw new BusinessRuleException("A request that was picked up cannot become new again; mark it in progress instead.");
        }
        Map<String, Object> before = new HashMap<>();
        before.put("status", r.getStatus());
        before.put("staffNote", r.getStaffNote());
        r.handle(in.status(), text(in.staffNote()));
        Map<String, Object> after = new HashMap<>();
        after.put("status", r.getStatus());
        after.put("staffNote", r.getStaffNote());
        after.put("company", r.getCompany());
        audit.record(actorEmail, "WHOLESALE_" + in.status().name(), "WHOLESALE_REQUEST", id, before, after);
        return InboxLine.of(r);
    }

    /** The contact, tidied and checked against its kind. */
    static String contact(ContactKind kind, String raw) {
        String v = line(raw);
        if (v == null) throw new BusinessRuleException("Leave a way for the family to answer you.");
        boolean ok = switch (kind) {
            case WHATSAPP, PHONE -> PHONE.matcher(v).matches() && v.replaceAll("\\D", "").length() >= 7;
            case TELEGRAM -> TELEGRAM.matcher(v).matches() || PHONE.matcher(v).matches();
            case EMAIL -> EMAIL.matcher(v).matches();
        };
        if (!ok) {
            throw new BusinessRuleException(switch (kind) {
                case WHATSAPP, PHONE -> "Write the phone number with its country code, for example +996 …";
                case TELEGRAM -> "Write your Telegram name (for example @akven_shop) or phone number.";
                case EMAIL -> "Write a full email address.";
            });
        }
        return kind == ContactKind.TELEGRAM && !v.startsWith("@") && !v.startsWith("+") && !Character.isDigit(v.charAt(0)) ? "@" + v : v;
    }

    /** One line of plain text, or null when empty. */
    static String line(String s) {
        if (s == null) return null;
        String v = s.replaceAll("\\p{Cc}", " ").replaceAll("\\s+", " ").strip();
        return v.isEmpty() ? null : v;
    }

    /** Several lines of plain text, or null when empty. */
    static String text(String s) {
        if (s == null) return null;
        String v = s.replace("\r\n", "\n").replaceAll("[\\p{Cc}&&[^\n]]", "").replaceAll("[ \\t]+", " ").replaceAll("\n{3,}", "\n\n").strip();
        return v.isEmpty() ? null : v;
    }
}
