package com.akven.thesis.catalog;

import com.akven.thesis.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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

    /** The owners' own section (Classic, Sport, ...). Null for bundles. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "section_id")
    private CatalogTerm section;

    /** How tall the sock is (Crew, Mid-long, ...). Null for bundles. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cut_id")
    private CatalogTerm cut;

    private String collection;

    @Column(length = 2000)
    private String description;

    /** e.g. "80% merino wool / 20% nylon" — sourced from the Korean manufacturing partner. */
    private String fabricComposition;

    /** Short quality label shown on the product page, e.g. "Premium merino". */
    @Column(length = 120)
    private String quality;

    @Column(length = 500)
    private String care;

    /** Where it is made, e.g. "Korea". */
    @Column(length = 80)
    private String origin;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    private Instant retiredAt;

    protected Product() {
        // JPA
    }

    public Product(String slug, String name, Category category, CatalogTerm section, CatalogTerm cut,
                   String collection, String description, String fabricComposition) {
        this.slug = slug;
        this.name = name;
        this.category = category;
        this.section = section;
        this.cut = cut;
        this.collection = collection;
        this.description = description;
        this.fabricComposition = fabricComposition;
    }

    /** Edits everything except the slug, which is a stable public identifier. */
    public void update(String name, Category category, CatalogTerm section, CatalogTerm cut, String collection,
                       String description, String fabricComposition, String quality, String care, String origin) {
        this.name = name;
        this.category = category;
        this.section = section;
        this.cut = cut;
        this.collection = collection;
        this.description = description;
        this.fabricComposition = fabricComposition;
        this.quality = quality;
        this.care = care;
        this.origin = origin;
    }

    public void setDetails(String quality, String care, String origin) {
        this.quality = quality;
        this.care = care;
        this.origin = origin;
    }

    /** Undo of retire(): the product is visible in the storefront again. */
    public void restore() {
        this.active = true;
        this.retiredAt = null;
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
    public CatalogTerm getSection() { return section; }
    public CatalogTerm getCut() { return cut; }
    public String getQuality() { return quality; }
    public String getCare() { return care; }
    public String getOrigin() { return origin; }
    public String getCollection() { return collection; }
    public String getDescription() { return description; }
    public String getFabricComposition() { return fabricComposition; }
    public boolean isActive() { return active; }
    public Instant getRetiredAt() { return retiredAt; }
}
