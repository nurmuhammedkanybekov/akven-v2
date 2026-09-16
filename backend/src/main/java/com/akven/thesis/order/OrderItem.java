package com.akven.thesis.order;

import com.akven.thesis.catalog.Variant;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "order_item")
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

    @Column(nullable = false)
    private Integer quantity;

    /** The final, validator-checked price for this line — never the LLM's raw proposal. */
    @Column(nullable = false)
    private BigDecimal agreedPrice;

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
    public BigDecimal getAgreedPrice() { return agreedPrice; }
}
