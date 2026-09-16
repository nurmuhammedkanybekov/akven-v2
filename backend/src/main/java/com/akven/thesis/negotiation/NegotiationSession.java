package com.akven.thesis.negotiation;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.user.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * One negotiation chat between a customer and the agent over a single variant.
 * proposedDiscountPct is whatever the LLM suggested — untrusted, logged as-is.
 * validatedDiscountPct is what PolicyValidator actually allowed. The two are
 * kept separate on purpose: it's the evidence trail for the margin-safety
 * argument in the thesis defense.
 */
@Entity
@Table(name = "negotiation_session")
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

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected NegotiationSession() {
        // JPA
    }

    public NegotiationSession(User customer, Variant variant) {
        this.customer = customer;
        this.variant = variant;
    }

    public UUID getId() { return id; }
    public BigDecimal getProposedDiscountPct() { return proposedDiscountPct; }
    public BigDecimal getValidatedDiscountPct() { return validatedDiscountPct; }
}
