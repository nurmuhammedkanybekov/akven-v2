package com.akven.thesis.catalog;

import jakarta.persistence.*;
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
public class Variant {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false, unique = true)
    private String sku;

    private String size;
    private String color;
    private Integer packSize;

    @Column(nullable = false)
    private BigDecimal price;

    /** Admin-only — never returned on customer-facing endpoints. */
    @Column(nullable = false)
    private BigDecimal costPrice;

    @Column(nullable = false)
    private BigDecimal marginFloorPct;

    @Column(nullable = false)
    private Integer stockQty = 0;

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

    public UUID getId() { return id; }
    public Product getProduct() { return product; }
    public String getSku() { return sku; }
    public BigDecimal getPrice() { return price; }
    public BigDecimal getMarginFloorPct() { return marginFloorPct; }
    public Integer getStockQty() { return stockQty; }
}
