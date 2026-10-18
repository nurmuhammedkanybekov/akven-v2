package com.akven.thesis.stock;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

/** A customer waiting for one sold-out option. One per customer and option; asking again after being told reopens it. */
@Entity
@Table(name = "stock_request", uniqueConstraints = @UniqueConstraint(name = "stock_request_once", columnNames = {"variant_id", "user_id"}))
public class StockRequest {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "variant_id", nullable = false)
    private UUID variantId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    /** When the owners wrote to the customer; null while the customer is still waiting. */
    private Instant notifiedAt;

    protected StockRequest() {
        // JPA
    }

    StockRequest(UUID variantId, UUID userId) {
        this.variantId = variantId;
        this.userId = userId;
    }

    void reopen() {
        notifiedAt = null;
        createdAt = Instant.now();
    }

    void markNotified() {
        notifiedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getVariantId() { return variantId; }
    public UUID getUserId() { return userId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getNotifiedAt() { return notifiedAt; }
}
