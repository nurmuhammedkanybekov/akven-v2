package com.akven.thesis.catalog;

import com.akven.thesis.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Category category;

    /** Null for bundles. */
    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private Cut cut;

    /** Null for bundles. */
    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private Occasion occasion;

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

    public Product(String slug, String name, Category category, Cut cut, Occasion occasion,
                   String collection, String description, String fabricComposition) {
        this.slug = slug;
        this.name = name;
        this.category = category;
        this.cut = cut;
        this.occasion = occasion;
        this.collection = collection;
        this.description = description;
        this.fabricComposition = fabricComposition;
    }

    /** Edits everything except the slug, which is a stable public identifier. */
    public void update(String name, Category category, Cut cut, Occasion occasion,
                       String collection, String description, String fabricComposition) {
        this.name = name;
        this.category = category;
        this.cut = cut;
        this.occasion = occasion;
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
    public Category getCategory() { return category; }
    public Cut getCut() { return cut; }
    public Occasion getOccasion() { return occasion; }
    public String getCollection() { return collection; }
    public String getDescription() { return description; }
    public String getFabricComposition() { return fabricComposition; }
    public boolean isActive() { return active; }
    public Instant getRetiredAt() { return retiredAt; }
}
