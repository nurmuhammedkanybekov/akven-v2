package com.akven.thesis.order;

import com.akven.thesis.user.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "customer_order")
public class Order {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "customer_id")
    private User customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.PENDING;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    /** Apple Pay / Google Pay token reference — never raw card data. See PaymentProvider (Phase 2). */
    private String paymentRef;

    private UUID negotiationSessionId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected Order() {
        // JPA
    }

    public Order(User customer) {
        this.customer = customer;
    }

    public UUID getId() { return id; }
    public OrderStatus getStatus() { return status; }
    public List<OrderItem> getItems() { return items; }
}
