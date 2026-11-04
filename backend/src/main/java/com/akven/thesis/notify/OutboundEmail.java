package com.akven.thesis.notify;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * One email to a customer, written in the same transaction as the change it reports (an outbox): if the change rolls
 * back, so does the email, and if the mail server is down the email waits here and is sent later.
 */
@Entity
@Table(name = "outbound_email")
public class OutboundEmail {

    /** After this many refusals the sender gives up and the email shows as failed in the admin. */
    static final int MAX_ATTEMPTS = 5;

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private EmailKind kind;

    @Column(name = "to_address", nullable = false)
    private String toAddress;

    @Column(nullable = false, length = 2)
    private String lang;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @Column(name = "order_id")
    private UUID orderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EmailStatus status = EmailStatus.QUEUED;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "last_error", length = 300)
    private String lastError;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt = Instant.now();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "sent_at")
    private Instant sentAt;

    protected OutboundEmail() {
        // JPA
    }

    OutboundEmail(EmailKind kind, String to, String lang, String subject, String body, UUID orderId) {
        this.kind = kind;
        this.toAddress = to;
        this.lang = lang;
        this.subject = subject.length() > 200 ? subject.substring(0, 200) : subject;
        this.body = body;
        this.orderId = orderId;
    }

    void sent() {
        status = EmailStatus.SENT;
        attempts++;
        sentAt = Instant.now();
        lastError = null;
    }

    /** A refusal: try again later (1, 2, 4, 8 minutes), and give up after {@link #MAX_ATTEMPTS}. */
    void refused(String error) {
        attempts++;
        lastError = error == null ? "Unknown error" : error.length() > 300 ? error.substring(0, 300) : error;
        if (attempts >= MAX_ATTEMPTS) status = EmailStatus.FAILED;
        else nextAttemptAt = Instant.now().plus(Duration.ofMinutes(1L << (attempts - 1)));
    }

    void keptUnsent() {
        status = EmailStatus.NOT_SENT;
        lastError = "No mail server is set up (MAIL_HOST), so the email was kept here and not sent.";
    }

    /** Back in the queue, after the mail server was fixed or set up. */
    void again() {
        status = EmailStatus.QUEUED;
        attempts = 0;
        lastError = null;
        nextAttemptAt = Instant.now();
    }

    public UUID getId() { return id; }
    public EmailKind getKind() { return kind; }
    public String getTo() { return toAddress; }
    public String getLang() { return lang; }
    public String getSubject() { return subject; }
    public String getBody() { return body; }
    public UUID getOrderId() { return orderId; }
    public EmailStatus getStatus() { return status; }
    public int getAttempts() { return attempts; }
    public String getLastError() { return lastError; }
    public Instant getNextAttemptAt() { return nextAttemptAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getSentAt() { return sentAt; }
}
