package com.akven.thesis.negotiation;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.AssertTrue;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * One negotiation chat between a customer and the agent over a single variant.
 * proposedDiscountPct is whatever the LLM suggested — untrusted, logged as-is.
 * validatedDiscountPct is what PolicyValidator actually allowed. The two are
 * kept separate on purpose: it's the evidence trail for the margin-safety
 * argument in the thesis defense. The DB mirrors the same invariant with a
 * CHECK constraint (validated <= proposed) — see V1__init_schema.sql.
 */
@Entity
@Table(name = "negotiation_session")
@EntityListeners(AuditingEntityListener.class)
public class NegotiationSession {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "customer_id")
    private User customer;

    @ManyToOne(optional = false)
    @JoinColumn(name = "variant_id")
    private Variant variant;

    @Column(columnDefinition = "text")
    private String transcript; // TODO Phase 2: normalize into a separate turn-by-turn table if needed for evaluation

    private BigDecimal proposedDiscountPct;
    private BigDecimal validatedDiscountPct;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected NegotiationSession() {
        // JPA
    }

    public NegotiationSession(User customer, Variant variant) {
        this.customer = customer;
        this.variant = variant;
    }

    /** Mirrors the DB CHECK in application-layer validation, so a bad write fails fast with a clear message. */
    @AssertTrue(message = "validatedDiscountPct must not exceed proposedDiscountPct")
    private boolean isMarginInvariantSatisfied() {
        return validatedDiscountPct == null || proposedDiscountPct == null
                || validatedDiscountPct.compareTo(proposedDiscountPct) <= 0;
    }

    public UUID getId() { return id; }
    public User getCustomer() { return customer; }
    public Variant getVariant() { return variant; }
    public String getTranscript() { return transcript; }
    public BigDecimal getProposedDiscountPct() { return proposedDiscountPct; }
    public BigDecimal getValidatedDiscountPct() { return validatedDiscountPct; }
    public Instant getCreatedAt() { return createdAt; }
}
