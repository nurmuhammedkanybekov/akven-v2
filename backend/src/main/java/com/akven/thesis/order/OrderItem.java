package com.akven.thesis.order;

import com.akven.thesis.catalog.Variant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
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

/** Insert-only line item — no version/updated_at needed since it's never edited after checkout. */
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

    /** The final, validator-checked price for this line — never the LLM's raw proposal. */
    @PositiveOrZero
    @Column(nullable = false)
    private BigDecimal agreedPrice;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected OrderItem() {
        // JPA
    }

    public OrderItem(Order order, Variant variant, Integer quantity, BigDecimal agreedPrice) {
        this.order = order;
        this.variant = variant;
        this.quantity = quantity;
        this.agreedPrice = agreedPrice;
    }

    public UUID getId() { return id; }
    public Order getOrder() { return order; }
    public Variant getVariant() { return variant; }
    public Integer getQuantity() { return quantity; }
    public BigDecimal getAgreedPrice() { return agreedPrice; }
    public Instant getCreatedAt() { return createdAt; }
}
