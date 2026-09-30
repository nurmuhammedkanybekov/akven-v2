package com.akven.thesis.catalog;

import com.akven.thesis.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** One section or cut, created and ordered by the admin. Inactive terms disappear from storefront filters. */
@Entity
@Table(name = "catalog_term")
public class CatalogTerm extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, updatable = false)
    private TermKind kind;

    @Column(nullable = false, length = 80, updatable = false)
    private String slug;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private int position;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    protected CatalogTerm() {
        // JPA
    }

    public CatalogTerm(TermKind kind, String slug, String name, String description, int position) {
        this.kind = kind;
        this.slug = slug;
        this.name = name;
        this.description = description;
        this.position = position;
    }

    public void update(String name, String description, boolean active) {
        this.name = name;
        this.description = description;
        this.active = active;
    }

    public void moveTo(int position) { this.position = position; }

    public UUID getId() { return id; }
    public TermKind getKind() { return kind; }
    public String getSlug() { return slug; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public int getPosition() { return position; }
    public boolean isActive() { return active; }
}
