package com.akven.thesis.catalog;

import com.akven.thesis.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.UUID;

/** A sock design/style, e.g. "Ak&Ven Wool Crew". Variants (size/color/pack) hang off this. */
@Entity
@Table(name = "product")
public class Product extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    /** URL-safe, e.g. "wool-crew-classic" — never reused once a product is retired. */
    @NotBlank
    @Column(nullable = false, unique = true, length = 160)
    private String slug;

    @NotBlank
    @Column(nullable = false)
    private String name;

    private String collection;

    @Column(length = 2000)
    private String description;

    /** e.g. "80% merino wool / 20% nylon" — sourced from the Korean manufacturing partner. */
    private String fabricComposition;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    private Instant retiredAt;

    protected Product() {
        // JPA
    }

    public Product(String slug, String name, String collection, String description, String fabricComposition) {
        this.slug = slug;
        this.name = name;
        this.collection = collection;
        this.description = description;
        this.fabricComposition = fabricComposition;
    }

    /** Soft delete (FR-10): hides the product from the storefront but keeps it intact for historical orders. */
    public void retire() {
        this.active = false;
        this.retiredAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getSlug() { return slug; }
    public String getName() { return name; }
    public String getCollection() { return collection; }
    public String getDescription() { return description; }
    public String getFabricComposition() { return fabricComposition; }
    public boolean isActive() { return active; }
    public Instant getRetiredAt() { return retiredAt; }
}
