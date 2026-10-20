package com.akven.thesis.review;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

/** One customer's word on one sock, after the sock reached them. */
@Entity
@Table(name = "product_review", uniqueConstraints = @UniqueConstraint(name = "product_review_once", columnNames = {"product_id", "user_id"}))
public class ProductReview {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private short rating;

    @Column(length = 40)
    private String author;

    @Column(nullable = false, length = 1000)
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ReviewStatus status = ReviewStatus.PENDING;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    private Instant moderatedAt;

    protected ProductReview() {
        // JPA
    }

    ProductReview(UUID productId, UUID userId) {
        this.productId = productId;
        this.userId = userId;
    }

    /** New words always go back to the owners before they are shown again. */
    void write(int rating, String author, String body) {
        this.rating = (short) rating;
        this.author = author;
        this.body = body;
        this.status = ReviewStatus.PENDING;
        this.createdAt = Instant.now();
        this.moderatedAt = null;
    }

    void moderate(ReviewStatus status) {
        this.status = status;
        this.moderatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getProductId() { return productId; }
    public UUID getUserId() { return userId; }
    public int getRating() { return rating; }
    public String getAuthor() { return author; }
    public String getBody() { return body; }
    public ReviewStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getModeratedAt() { return moderatedAt; }
}
