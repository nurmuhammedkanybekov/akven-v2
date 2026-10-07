package com.akven.thesis.order;

import com.akven.thesis.catalog.Variant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * One line of an order. Besides the link to the variant it keeps a snapshot of what was bought (name, options, list
 * price, discount), so the receipt stays true after the catalog is edited or the product is retired.
 * unitPrice (agreed_price) is the validator-checked price, never a value the client or the language model supplied.
 */
@Entity
@Table(name = "order_item", uniqueConstraints = @UniqueConstraint(columnNames = {"order_id", "variant_id"}))
@EntityListeners(AuditingEntityListener.class)
public class OrderItem {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(optional = false)
    @JoinColumn(name = "variant_id")
    private Variant variant;

    @Positive
    @Column(nullable = false)
    private Integer quantity;

    /** Price of one unit after any validated discount. */
    @PositiveOrZero
    @Column(name = "agreed_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(nullable = false, length = 64) private String sku = "";
    @Column(nullable = false) private String productName = "";
    @Column(length = 160) private String productSlug;
    @Column(length = 200) private String variantLabel;
    @Column(length = 7) private String colorHex;
    @Column(length = 500) private String imageUrl;
    @Column(nullable = false) private BigDecimal listPrice = BigDecimal.ZERO;
    @Column(nullable = false) private BigDecimal discountPct = BigDecimal.ZERO;
    @Column(nullable = false) private BigDecimal tierDiscountPct = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) private DiscountSource discountSource = DiscountSource.NONE;
    @Column(nullable = false) private boolean discountCapped = false;

    /** The negotiated offer this line used, if any. Cleared when the order is cancelled. */
    private UUID negotiationSessionId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected OrderItem() {
        // JPA
    }

    public OrderItem(Order order, Variant variant, int quantity, BigDecimal listPrice, BigDecimal discountPct,
                     BigDecimal unitPrice, UUID negotiationSessionId, String productName, String productSlug,
                     String variantLabel, String imageUrl) {
        this.order = order;
        this.variant = variant;
        this.quantity = quantity;
        this.listPrice = listPrice;
        this.discountPct = discountPct;
        this.unitPrice = unitPrice;
        this.negotiationSessionId = negotiationSessionId;
        this.sku = variant.getSku();
        this.colorHex = variant.getColorHex();
        this.productName = productName;
        this.productSlug = productSlug;
        this.variantLabel = variantLabel;
        this.imageUrl = imageUrl;
    }

    /** Why this line costs what it costs: which rule gave the discount, and whether the sock's limit cut it down. */
    void recordReason(BigDecimal tierDiscountPct, DiscountSource source, boolean capped) {
        this.tierDiscountPct = tierDiscountPct;
        this.discountSource = source;
        this.discountCapped = capped;
    }

    public BigDecimal lineTotal() {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    void releaseOffer() {
        this.negotiationSessionId = null;
    }

    public BigDecimal getTierDiscountPct() { return tierDiscountPct; }
    public DiscountSource getDiscountSource() { return discountSource; }
    public boolean isDiscountCapped() { return discountCapped; }
    public UUID getId() { return id; }
    public Order getOrder() { return order; }
    public Variant getVariant() { return variant; }
    public Integer getQuantity() { return quantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public String getSku() { return sku; }
    public String getProductName() { return productName; }
    public String getProductSlug() { return productSlug; }
    public String getVariantLabel() { return variantLabel; }
    public String getColorHex() { return colorHex; }
    public String getImageUrl() { return imageUrl; }
    public BigDecimal getListPrice() { return listPrice; }
    public BigDecimal getDiscountPct() { return discountPct; }
    public UUID getNegotiationSessionId() { return negotiationSessionId; }
    public Instant getCreatedAt() { return createdAt; }
}
