package com.akven.thesis.order;

import com.akven.thesis.common.AuditableEntity;
import com.akven.thesis.common.ConflictException;
import com.akven.thesis.shop.PickupPoint;
import com.akven.thesis.user.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A customer's order. The status machine lives here so no caller can skip a step:
 * PENDING -> PAID -> FULFILLED, and PENDING or PAID -> CANCELLED. A FULFILLED or CANCELLED order never changes again.
 * It becomes PAID only with a payment reference from a confirmed token (FR-8), and the database refuses a PAID row without one.
 */
@Entity
@Table(name = "customer_order")
public class Order extends AuditableEntity {

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

    /** Reference returned by the payment provider for the confirmed token. Never card data. */
    private String paymentRef;

    @Column(length = 16)
    private String paymentMethod;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "fulfillment_method", nullable = false, length = 16)
    private FulfillmentMethod fulfillmentMethod = FulfillmentMethod.PICKUP;

    @Column(length = 120) private String contactName;
    @Column(length = 40) private String contactPhone;
    @Column(length = 300) private String deliveryAddress;
    @Column(length = 500) private String note;

    @Enumerated(EnumType.STRING)
    @Column(length = 2)
    private Country deliveryCountry;

    @Column(length = 64)
    private String idempotencyKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_point_id")
    private PickupPoint pickupPoint;

    @Column(length = 6)
    private String pickupCode;

    private Instant paidAt;
    private Instant fulfilledAt;
    private Instant cancelledAt;

    protected Order() {
        // JPA
    }

    public Order(User customer, String idempotencyKey) {
        this.customer = customer;
        this.idempotencyKey = idempotencyKey;
    }

    public void addItem(OrderItem item) {
        items.add(item);
        total = total.add(item.lineTotal());
    }

    public void setFulfillment(FulfillmentMethod method, String contactName, String contactPhone, String deliveryAddress, String note,
                               Country deliveryCountry) {
        this.fulfillmentMethod = method;
        this.deliveryCountry = method == FulfillmentMethod.DELIVERY ? deliveryCountry : null;
        this.contactName = contactName;
        this.contactPhone = contactPhone;
        this.deliveryAddress = deliveryAddress;
        this.note = note;
    }

    /** Where a pickup order will be collected. */
    public void collectAt(PickupPoint point) {
        this.pickupPoint = point;
    }

    /** The six digits the customer shows at the stall; given once the order is paid. */
    public void givePickupCode(String code) {
        this.pickupCode = code;
    }

    /** PENDING -> PAID, only with the provider's reference for a confirmed payment. */
    public void markPaid(String paymentMethod, String paymentRef) {
        if (status != OrderStatus.PENDING) {
            throw new ConflictException("Only a pending order can be paid (it is " + status + ").");
        }
        if (paymentRef == null || paymentRef.isBlank()) {
            throw new IllegalStateException("An order cannot be paid without a payment reference");
        }
        this.paymentMethod = paymentMethod;
        this.paymentRef = paymentRef;
        this.status = OrderStatus.PAID;
        this.paidAt = Instant.now();
    }

    /** PAID -> FULFILLED. */
    public void fulfil() {
        if (status != OrderStatus.PAID) {
            throw new ConflictException("Only a paid order can be fulfilled (it is " + status + ").");
        }
        this.status = OrderStatus.FULFILLED;
        this.fulfilledAt = Instant.now();
    }

    /** PENDING or PAID -> CANCELLED. Releases the customer's negotiated offers so they can be used again. */
    public void cancel() {
        if (status == OrderStatus.FULFILLED || status == OrderStatus.CANCELLED) {
            throw new ConflictException("This order is already " + status.name().toLowerCase() + " and cannot be cancelled.");
        }
        this.status = OrderStatus.CANCELLED;
        this.cancelledAt = Instant.now();
        items.forEach(OrderItem::releaseOffer);
    }

    public UUID getId() { return id; }
    public User getCustomer() { return customer; }
    public OrderStatus getStatus() { return status; }
    public List<OrderItem> getItems() { return items; }
    public String getPaymentRef() { return paymentRef; }
    public String getPaymentMethod() { return paymentMethod; }
    public BigDecimal getTotal() { return total; }
    public FulfillmentMethod getFulfillmentMethod() { return fulfillmentMethod; }
    public String getContactName() { return contactName; }
    public String getContactPhone() { return contactPhone; }
    public String getDeliveryAddress() { return deliveryAddress; }
    public String getNote() { return note; }
    public Country getDeliveryCountry() { return deliveryCountry; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public PickupPoint getPickupPoint() { return pickupPoint; }
    public String getPickupCode() { return pickupCode; }
    public Instant getPaidAt() { return paidAt; }
    public Instant getFulfilledAt() { return fulfilledAt; }
    public Instant getCancelledAt() { return cancelledAt; }

    /** Short, readable number for receipts and support calls: AV-3F2A9C1B. */
    public String getReference() { return "AV-" + id.toString().substring(0, 8).toUpperCase(); }
}
