package com.akven.thesis.notify;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.common.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** The emails the shop wrote to customers, for the family: what was said, to whom, and whether it went out. */
@RestController
@RequestMapping("/api/admin/emails")
public class EmailController {

    public record EmailView(UUID id, EmailKind kind, String to, String lang, String subject, String body, UUID orderId,
                            EmailStatus status, int attempts, String lastError, Instant createdAt, Instant sentAt) {
        static EmailView of(OutboundEmail e) {
            return new EmailView(e.getId(), e.getKind(), e.getTo(), e.getLang(), e.getSubject(), e.getBody(), e.getOrderId(),
                    e.getStatus(), e.getAttempts(), e.getLastError(), e.getCreatedAt(), e.getSentAt());
        }
    }

    /** mode: SMTP when a mail server is set up, OFF when emails are only kept here. */
    public record EmailList(String mode, long failed, PageResponse<EmailView> emails) {}

    private final OutboundEmailRepository emails;
    private final EmailSender sender;
    private final AuditService audit;

    public EmailController(OutboundEmailRepository emails, EmailSender sender, AuditService audit) {
        this.emails = emails;
        this.sender = sender;
        this.audit = audit;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public EmailList list(@RequestParam(required = false) EmailStatus status, @RequestParam(defaultValue = "0") int page) {
        PageRequest p = PageRequest.of(Math.max(page, 0), 30);
        var found = status == null ? emails.findAllByOrderByCreatedAtDesc(p) : emails.findByStatusOrderByCreatedAtDesc(status, p);
        return new EmailList(sender.mode(), emails.countByStatus(EmailStatus.FAILED), PageResponse.of(found, EmailView::of));
    }

    @GetMapping(params = "orderId")
    @Transactional(readOnly = true)
    public List<EmailView> forOrder(@RequestParam UUID orderId) {
        return emails.findByOrderIdOrderByCreatedAtAsc(orderId).stream().map(EmailView::of).toList();
    }

    /** Back into the queue: after the mail server was fixed, or once one is set up. */
    @PostMapping("/{id}/retry")
    @Transactional
    public EmailView retry(Authentication auth, @PathVariable UUID id) {
        OutboundEmail e = emails.findById(id).orElseThrow(() -> new NotFoundException("No such email."));
        if (e.getStatus() == EmailStatus.SENT || e.getStatus() == EmailStatus.QUEUED) {
            throw new BusinessRuleException("This email is already " + e.getStatus().name().toLowerCase() + ".");
        }
        e.again();
        audit.record(auth.getName(), "EMAIL_RETRIED", "EMAIL", e.getId(), null, Map.of("kind", e.getKind()));
        return EmailView.of(e);
    }
}
