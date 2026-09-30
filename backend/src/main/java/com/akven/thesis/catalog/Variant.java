package com.akven.thesis.catalog;

import com.akven.thesis.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * A sellable SKU: one size/color/pack combination of a Product.
 * marginFloorPct is the hard limit the Negotiation module's Policy Validator
 * enforces — the LLM never sees or sets this value directly, it only ever
 * proposes a discount that gets checked against it server-side.
 */
@Entity
@Table(name = "variant")
public class Variant extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String sku;

    private String size;
    private String color;

    @Positive
    private Integer packSize;

    @PositiveOrZero
    @Column(nullable = false)
    private BigDecimal price;

    /** Admin-only — never returned on customer-facing endpoints. */
    @PositiveOrZero
    @Column(nullable = false)
    private BigDecimal costPrice;

    @DecimalMin("0.00")
    @DecimalMax("100.00")
    @Column(nullable = false)
    private BigDecimal marginFloorPct;

    @PositiveOrZero
    @Column(nullable = false)
    private Integer stockQty = 0;

    /** Held by open carts/pending orders. Storefront-visible stock is availableQty, not stockQty. */
    @PositiveOrZero
    @Column(nullable = false)
    private Integer reservedQty = 0;

    /** Database-generated (stock_qty - reserved_qty) — read-only from the app side. */
    @Column(insertable = false, updatable = false)
    private Integer availableQty;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    protected Variant() {
        // JPA
    }

    public Variant(Product product, String sku, String size, String color, Integer packSize,
                    BigDecimal price, BigDecimal costPrice, BigDecimal marginFloorPct) {
        this.product = product;
        this.sku = sku;
        this.size = size;
        this.color = color;
        this.packSize = packSize;
        this.price = price;
        this.costPrice = costPrice;
        this.marginFloorPct = marginFloorPct;
    }

    /** Staff-level edit: descriptive fields, selling price and stock. Never touches cost or margin floor. */
    public void updateListing(String size, String color, Integer packSize, BigDecimal price,
                              Integer stockQty, boolean active) {
        this.size = size;
        this.color = color;
        this.packSize = packSize;
        this.price = price;
        this.stockQty = stockQty;
        this.active = active;
    }

    /** Admin-only pricing policy: the two fields the negotiation guardrail is built on. */
    public void updatePricingPolicy(BigDecimal costPrice, BigDecimal marginFloorPct) {
        this.costPrice = costPrice;
        this.marginFloorPct = marginFloorPct;
    }

    public void setStockQty(Integer stockQty) { this.stockQty = stockQty; }

    /** Computed here rather than read from the generated column, so it is correct on H2 and Postgres alike. */
    public int available() {
        return stockQty - reservedQty;
    }

    public UUID getId() { return id; }
    public String getSize() { return size; }
    public String getColor() { return color; }
    public Integer getPackSize() { return packSize; }
    public Product getProduct() { return product; }
    public String getSku() { return sku; }
    public BigDecimal getPrice() { return price; }
    public BigDecimal getCostPrice() { return costPrice; }
    public BigDecimal getMarginFloorPct() { return marginFloorPct; }
    public Integer getStockQty() { return stockQty; }
    public Integer getReservedQty() { return reservedQty; }
    public Integer getAvailableQty() { return availableQty; }
    public boolean isActive() { return active; }
}
