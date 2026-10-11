package com.akven.thesis.negotiation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * One message and answer in a negotiation (V21). Like the session, it keeps the assistant's proposal next to what the
 * PolicyValidator allowed, and the database refuses a row where the allowed discount is larger.
 */
@Entity
@Table(name = "negotiation_turn")
@EntityListeners(AuditingEntityListener.class)
public class NegotiationTurn {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "session_id")
    private NegotiationSession session;

    @Column(nullable = false)
    private int position;

    @Column(name = "customer_message", nullable = false, length = 500)
    private String customerMessage;

    @Column(nullable = false, length = 1000)
    private String reply;

    @Column(nullable = false, length = 5)
    private String language;

    /** Which assistant answered: rules, llm or rules-fallback. */
    @Column(nullable = false, length = 20)
    private String assistant;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "proposed_discount_pct", nullable = false)
    private BigDecimal proposedDiscountPct;

    @Column(name = "validated_discount_pct", nullable = false)
    private BigDecimal validatedDiscountPct;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected NegotiationTurn() {
        // JPA
    }

    NegotiationTurn(NegotiationSession session, int position, String customerMessage, String reply, String language, String assistant,
                    int quantity, BigDecimal proposedDiscountPct, BigDecimal validatedDiscountPct) {
        this.session = session;
        this.position = position;
        this.customerMessage = customerMessage;
        this.reply = reply.length() > 1000 ? reply.substring(0, 1000) : reply;
        this.language = language;
        this.assistant = assistant;
        this.quantity = quantity;
        this.proposedDiscountPct = proposedDiscountPct;
        this.validatedDiscountPct = validatedDiscountPct;
    }

    public UUID getId() { return id; }
    public NegotiationSession getSession() { return session; }
    public int getPosition() { return position; }
    public String getCustomerMessage() { return customerMessage; }
    public String getReply() { return reply; }
    public String getLanguage() { return language; }
    public String getAssistant() { return assistant; }
    public int getQuantity() { return quantity; }
    public BigDecimal getProposedDiscountPct() { return proposedDiscountPct; }
    public BigDecimal getValidatedDiscountPct() { return validatedDiscountPct; }
    public Instant getCreatedAt() { return createdAt; }
}
