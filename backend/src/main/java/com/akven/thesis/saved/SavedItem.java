package com.akven.thesis.saved;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

/** A sock a customer saved with the heart, kept with the account. */
@Entity
@Table(name = "saved_item", uniqueConstraints = @UniqueConstraint(name = "saved_item_once", columnNames = {"user_id", "product_id"}))
public class SavedItem {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected SavedItem() {
        // JPA
    }

    SavedItem(UUID userId, UUID productId) {
        this.userId = userId;
        this.productId = productId;
    }

    public UUID getProductId() { return productId; }
    public Instant getCreatedAt() { return createdAt; }
}
