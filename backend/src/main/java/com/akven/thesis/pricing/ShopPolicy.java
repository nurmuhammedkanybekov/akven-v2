package com.akven.thesis.pricing;

import java.math.BigDecimal;
import com.akven.thesis.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** The owners' order rules. There is exactly one row (id 1); the database refuses a second one. */
@Entity
@Table(name = "shop_policy")
public class ShopPolicy extends AuditableEntity {

    public static final short ID = 1;

    @Id
    private Short id = ID;

    @Column(nullable = false)
    private Integer minOrderPairs = 1;

    @Column(nullable = false)
    private Integer trustedMinOrderPairs = 1;

    @Column(nullable = false)
    private Integer trustedAfterOrders = 3;

    @Column(nullable = false)
    private Integer fewLeftThreshold = 5;

    /** How many som one US dollar is, as the owners set it. Prices are kept in dollars and shown in som with this. */
    @Column(name = "som_per_usd", nullable = false)
    private BigDecimal somPerUsd = new BigDecimal("87.50");

    /** Som prices are rounded to this many som: 1, 5, 10, 50 or 100. */
    @Column(name = "som_rounding", nullable = false)
    private Integer somRounding = 10;

    /** How many Russian roubles one US dollar is, for visitors from Russia, as the owners set it. */
    @Column(name = "rub_per_usd", nullable = false)
    private BigDecimal rubPerUsd = new BigDecimal("82.00");

    /** Rouble prices are rounded to this many roubles: 1, 5, 10, 50 or 100. */
    @Column(name = "rub_rounding", nullable = false)
    private Integer rubRounding = 10;

    protected ShopPolicy() {
        // JPA
    }

    /** No minimum: what the shop does until the owners set one (and what a fresh test database has). */
    static ShopPolicy defaults() {
        return new ShopPolicy();
    }

    void update(int minOrderPairs, int trustedMinOrderPairs, int trustedAfterOrders, int fewLeftThreshold) {
        this.minOrderPairs = minOrderPairs;
        this.trustedMinOrderPairs = trustedMinOrderPairs;
        this.trustedAfterOrders = trustedAfterOrders;
        this.fewLeftThreshold = fewLeftThreshold;
    }

    public int getMinOrderPairs() { return minOrderPairs; }
    public int getTrustedMinOrderPairs() { return trustedMinOrderPairs; }
    public int getTrustedAfterOrders() { return trustedAfterOrders; }
    public int getFewLeftThreshold() { return fewLeftThreshold; }
    public BigDecimal getSomPerUsd() { return somPerUsd; }
    public int getSomRounding() { return somRounding; }
    public BigDecimal getRubPerUsd() { return rubPerUsd; }
    public int getRubRounding() { return rubRounding; }

    void updateRub(BigDecimal rubPerUsd, int rubRounding) {
        this.rubPerUsd = rubPerUsd;
        this.rubRounding = rubRounding;
    }

    void updateSom(BigDecimal somPerUsd, int somRounding) {
        this.somPerUsd = somPerUsd;
        this.somRounding = somRounding;
    }

    /** A dollar price in som, rounded the owners' way (half up). Used wherever the shop speaks in som. */
    public long toSom(BigDecimal usd) {
        BigDecimal step = BigDecimal.valueOf(somRounding);
        return usd.multiply(somPerUsd).divide(step, 0, java.math.RoundingMode.HALF_UP).multiply(step).longValueExact();
    }
}
