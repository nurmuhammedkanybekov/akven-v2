package com.akven.thesis.order;

import com.akven.thesis.delivery.DeliveryKind;
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
import java.util.Map;

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

    /** The account that ordered; null for a guest, who has {@link #guestEmail} instead. */
    @ManyToOne
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

    @Column(name = "delivery_zone_id")
    private UUID deliveryZoneId;

    @Column(name = "delivery_zone_name", length = 60)
    private String deliveryZoneName;

    @Column(name = "delivery_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal deliveryFee = BigDecimal.ZERO;

    @Column(name = "delivery_days_min")
    private Integer deliveryDaysMin;

    @Column(name = "delivery_days_max")
    private Integer deliveryDaysMax;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_kind", length = 10)
    private DeliveryKind deliveryKind;

    @Column(name = "delivery_pay_on_receipt", nullable = false)
    private boolean deliveryPayOnReceipt;

    @Column(length = 64)
    private String idempotencyKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pickup_point_id")
    private PickupPoint pickupPoint;

    @Column(length = 6)
    private String pickupCode;

    /** A guest's email (lower case): where the confirmation and the private link to the order go. */
    @Column(name = "guest_email")
    private String guestEmail;

    /** The language the customer used at checkout (en, ru or ky): the emails about this order are written in it. */
    @Column(nullable = false, length = 2)
    private String lang = "en";

    @Enumerated(EnumType.STRING)
    @Column(length = 12)
    private GiftBox giftBox;

    @Enumerated(EnumType.STRING)
    @Column(length = 12)
    private GiftRibbon giftRibbon;

    @Column(length = 60) private String giftTo;
    @Column(length = 60) private String giftFrom;
    @Column(length = 300) private String giftMessage;

    @Column(nullable = false)
    private boolean giftHidePrices;

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

    /** An order without an account: the guest's email takes the account's place. */
    public static Order forGuest(String email, String idempotencyKey) {
        Order o = new Order(null, idempotencyKey);
        o.guestEmail = email.strip().toLowerCase(java.util.Locale.ROOT);
        return o;
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

    /**
     * The delivery area, copied onto the order so a later change to the area never changes this receipt. Called once,
     * after the socks are added: the fee is added to the total the customer pays.
     */
    public void deliverIn(UUID zoneId, String zoneName, BigDecimal fee, Integer daysMin, Integer daysMax) {
        deliverIn(zoneId, zoneName, fee, daysMin, daysMax, DeliveryKind.COURIER, false);
    }

    /** As above, with how the area is delivered (courier or cargo) and whether the carrier is paid on receipt. */
    public void deliverIn(UUID zoneId, String zoneName, BigDecimal fee, Integer daysMin, Integer daysMax, DeliveryKind kind, boolean payOnReceipt) {
        this.deliveryKind = kind;
        this.deliveryPayOnReceipt = payOnReceipt;
        if (fulfillmentMethod != FulfillmentMethod.DELIVERY || deliveryZoneName != null) {
            throw new IllegalStateException("Delivery is set once, on a delivery order.");
        }
        this.deliveryZoneId = zoneId;
        this.deliveryZoneName = zoneName;
        this.deliveryFee = fee;
        this.deliveryDaysMin = daysMin;
        this.deliveryDaysMax = daysMax;
        this.total = total.add(fee);
    }

    /** What the socks cost, without delivery. */
    public BigDecimal getItemsTotal() { return total.subtract(deliveryFee); }

    /** Packs the order as a gift: a box, a ribbon and a card with the words exactly as typed. */
    public void wrapAsGift(GiftBox box, GiftRibbon ribbon, String to, String from, String message, boolean hidePrices) {
        this.giftBox = box;
        this.giftRibbon = ribbon;
        this.giftTo = to;
        this.giftFrom = from;
        this.giftMessage = message;
        this.giftHidePrices = hidePrices;
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
            throw new ConflictException("ORDER_NOT_CANCELLABLE", Map.of("status", status.name()), "This order is already " + status.name().toLowerCase() + " and cannot be cancelled.");
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
    public UUID getDeliveryZoneId() { return deliveryZoneId; }
    public String getDeliveryZoneName() { return deliveryZoneName; }
    public BigDecimal getDeliveryFee() { return deliveryFee; }
    public Integer getDeliveryDaysMin() { return deliveryDaysMin; }
    public Integer getDeliveryDaysMax() { return deliveryDaysMax; }
    public DeliveryKind getDeliveryKind() { return deliveryKind; }
    public boolean isDeliveryPayOnReceipt() { return deliveryPayOnReceipt; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public PickupPoint getPickupPoint() { return pickupPoint; }
    public String getPickupCode() { return pickupCode; }
    public String getLang() { return lang; }
    public String getGuestEmail() { return guestEmail; }
    public boolean isGuest() { return customer == null; }
    /** Where emails about this order go: the account's address, or the guest's. */
    public String getContactEmail() { return customer != null ? customer.getEmail() : guestEmail; }
    public void speak(String lang) { this.lang = lang == null || !lang.matches("en|ru|ky") ? "en" : lang; }
    public GiftBox getGiftBox() { return giftBox; }
    public GiftRibbon getGiftRibbon() { return giftRibbon; }
    public String getGiftTo() { return giftTo; }
    public String getGiftFrom() { return giftFrom; }
    public String getGiftMessage() { return giftMessage; }
    public boolean isGiftHidePrices() { return giftHidePrices; }
    public Instant getPaidAt() { return paidAt; }
    public Instant getFulfilledAt() { return fulfilledAt; }
    public Instant getCancelledAt() { return cancelledAt; }

    /** Short, readable number for receipts and support calls: AV-3F2A9C1B. */
    public String getReference() { return "AV-" + id.toString().substring(0, 8).toUpperCase(); }
}
