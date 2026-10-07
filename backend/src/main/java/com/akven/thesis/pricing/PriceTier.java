package com.akven.thesis.pricing;

import com.akven.thesis.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

/** One step of the price ladder: a collection of at least minPairs pairs gets discountPct off. */
@Entity
@Table(name = "price_tier")
public class PriceTier extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true)
    private Integer minPairs;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPct;

    protected PriceTier() {
        // JPA
    }

    public PriceTier(int minPairs, BigDecimal discountPct) {
        this.minPairs = minPairs;
        this.discountPct = discountPct;
    }

    void update(int minPairs, BigDecimal discountPct) {
        this.minPairs = minPairs;
        this.discountPct = discountPct;
    }

    public UUID getId() { return id; }
    public int getMinPairs() { return minPairs; }
    public BigDecimal getDiscountPct() { return discountPct; }
}
