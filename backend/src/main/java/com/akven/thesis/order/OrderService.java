package com.akven.thesis.order;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.stock.StockLedger;
import com.akven.thesis.stock.StockReason;
import com.akven.thesis.catalog.ProductImageRepository;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.catalog.VariantRepository;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.ConflictException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.common.PageResponse;
import com.akven.thesis.delivery.DeliveryService;
import com.akven.thesis.notify.Notifier;
import com.akven.thesis.delivery.DeliveryZone;
import com.akven.thesis.order.OrderDtos.CartItem;
import com.akven.thesis.order.OrderDtos.CheckoutRequest;
import com.akven.thesis.order.OrderDtos.OrderView;
import com.akven.thesis.payment.PaymentMethod;
import com.akven.thesis.payment.PaymentRequest;
import com.akven.thesis.payment.PaymentResult;
import com.akven.thesis.payment.PaymentService;
import com.akven.thesis.payment.PaymentUnavailableException;
import com.akven.thesis.pricing.CollectionPricing;
import com.akven.thesis.shop.ShopInfoService;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Checkout and the life of an order.
 *
 * What makes it safe:
 * <ul>
 *   <li>Prices come from PricingService, never from the request.</li>
 *   <li>The variants in the cart are LOCKED (SELECT ... FOR UPDATE, in SKU order) before stock is checked, so two
 *       people buying the last pair cannot both succeed, and the database's own stock >= reserved CHECK is the last backstop.</li>
 *   <li>The Idempotency-Key makes a retried or double-clicked request return the same order instead of charging twice.</li>
 *   <li>The order is PAID only after the provider confirmed the token; a decline cancels the order and releases the stock,
 *       and that outcome is committed.</li>
 *   <li>Every state change is written to the audit log in the same transaction.</li>
 * </ul>
 */
@Service
public class OrderService {

    private final OrderRepository orders;
    private final VariantRepository variants;
    private final UserRepository users;
    private final PricingService pricing;
    private final PaymentService payments;
    private final AuditService audit;
    private final CollectionPricing collections;
    private final ShopInfoService shopInfo;
    private final PickupCodes pickupCodes;
    private final DeliveryService delivery;
    private final Notifier notifier;
    private final OrderLinks links;
    private final StockLedger ledger;
    /** How long a reservation (pay at handover) holds its pairs, and the most pairs one reservation may hold. */
    private final int reservationHours;
    private final int reserveMaxPairs;

    public OrderService(OrderRepository orders, VariantRepository variants, UserRepository users, PricingService pricing,
                        PaymentService payments, AuditService audit, ProductImageRepository images, CollectionPricing collections,
                        ShopInfoService shopInfo, PickupCodes pickupCodes, DeliveryService delivery, Notifier notifier,
                        OrderLinks links, StockLedger ledger,
                        @org.springframework.beans.factory.annotation.Value("${akven.orders.reservation-hours:48}") int reservationHours,
                        @org.springframework.beans.factory.annotation.Value("${akven.orders.reserve-max-pairs:60}") int reserveMaxPairs) {
        this.orders = orders;
        this.variants = variants;
        this.users = users;
        this.pricing = pricing;
        this.payments = payments;
        this.audit = audit;
        this.images = images;
        this.collections = collections;
        this.shopInfo = shopInfo;
        this.pickupCodes = pickupCodes;
        this.delivery = delivery;
        this.notifier = notifier;
        this.links = links;
        this.ledger = ledger;
        this.reservationHours = reservationHours;
        this.reserveMaxPairs = reserveMaxPairs;
    }

    private final ProductImageRepository images;

    public record CheckoutResult(OrderView order, boolean replayed) {}

    @Transactional(noRollbackFor = PaymentFailedException.class)
    public CheckoutResult checkout(String customerEmail, String idempotencyKey, CheckoutRequest request) {
        // Signed in: the account orders. Not signed in: a guest, who gives an email for the confirmation and the link.
        User customer = customerEmail == null ? null : requireUser(customerEmail);
        String guestEmail = customer != null ? null : guestEmail(request.email());

        Optional<Order> earlier = customer != null ? orders.findByCustomerIdAndIdempotencyKey(customer.getId(), idempotencyKey)
                : orders.findByCustomerIsNullAndIdempotencyKey(idempotencyKey).filter(o -> o.getGuestEmail().equals(guestEmail));
        if (earlier.isPresent()) {
            return replay(earlier.get());
        }

        // No provider (outside demo mode, until a real one is connected): refuse before anything is reserved.
        payments.requireAvailable(request.payment().method());

        Map<String, Integer> quantities = new LinkedHashMap<>();
        Map<String, UUID> offers = new LinkedHashMap<>();
        for (CartItem item : request.items()) {
            quantities.merge(item.sku(), item.quantity(), Integer::sum);
            if (item.negotiationSessionId() != null && offers.putIfAbsent(item.sku(), item.negotiationSessionId()) != null
                    && !offers.get(item.sku()).equals(item.negotiationSessionId())) {
                throw new BusinessRuleException("OFFER_ONE_PER_ITEM", Map.of(), "Only one negotiated offer can be used per item.");
            }
        }
        if (request.fulfillment().method() == FulfillmentMethod.DELIVERY
                && (request.fulfillment().address() == null || request.fulfillment().address().isBlank())) {
            throw new BusinessRuleException("DELIVERY_ADDRESS_REQUIRED", Map.of(), "Enter a delivery address, or choose pickup.");
        }

        // Lock first, then look at stock: this is what makes the last-pair race safe.
        List<Variant> locked = variants.lockBySkuIn(quantities.keySet());
        Set<String> found = locked.stream().map(Variant::getSku).collect(Collectors.toSet());
        Set<String> missing = new TreeSet<>(quantities.keySet());
        missing.removeAll(found);
        if (!missing.isEmpty()) {
            throw new BusinessRuleException("ITEMS_GONE", Map.of(), "Some items are no longer in the shop: " + String.join(", ", missing) + ".");
        }

        // The cart is one collection: the minimum and the price tier count pairs across all lines.
        Map<Variant, Integer> byVariant = new LinkedHashMap<>();
        for (Variant v : locked) byVariant.put(v, quantities.get(v.getSku()));
        CollectionPricing.Collection collection = collections.evaluate(byVariant, customer);
        if (collection.belowMinimum()) {
            throw new BusinessRuleException("MINIMUM_ORDER", Map.of("n", collection.minimumPairs()), collection.minimumMessage());
        }

        PaymentMethod method = request.payment().method();
        if (!method.online()) {
            // Holding pairs costs nothing to the one who reserves them, so one reservation may not empty the shelf.
            int pairs = byVariant.entrySet().stream()
                    .mapToInt(e -> e.getValue() * (e.getKey().getPackSize() == null ? 1 : e.getKey().getPackSize())).sum();
            if (pairs > reserveMaxPairs) {
                throw new BusinessRuleException("RESERVE_TOO_BIG", Map.of("n", reserveMaxPairs),
                        "To pay at handover, reserve up to " + reserveMaxPairs + " pairs; for more, ask for a wholesale order.");
            }
        }

        FulfillmentInputs f = new FulfillmentInputs(request);
        // The area decides the fee; the browser only says which area. Its country wins over a country sent alongside.
        DeliveryZone zone = f.method == FulfillmentMethod.DELIVERY ? delivery.zoneFor(request.fulfillment().zoneId(), request.fulfillment().zoneId() == null ? f.country : null) : null;
        Order order = customer != null ? new Order(customer, idempotencyKey) : Order.forGuest(guestEmail, idempotencyKey);
        order.speak(request.lang());
        order.setFulfillment(f.method, f.name, f.phone, f.address, f.note, zone == null ? f.country : zone.getCountry());
        if (request.gift() != null) {
            OrderDtos.GiftInput g = request.gift();
            order.wrapAsGift(g.box(), g.ribbon(), cardText(g.to()), cardText(g.from()), cardText(g.message()), g.hidePrices());
        }
        if (f.method == FulfillmentMethod.PICKUP) {
            shopInfo.defaultPickupPoint().ifPresent(order::collectAt);
        }
        Map<String, String> pictures = CartService.pictures(locked, images);
        for (Variant v : locked) {
            int qty = quantities.get(v.getSku());
            String name = v.getProduct().getName();
            if (!v.isActive() || !v.getProduct().isActive()) {
                throw new ConflictException("ITEM_UNAVAILABLE", Map.of("name", name), name + " is no longer available.");
            }
            if (v.available() <= 0) {
                throw new ConflictException("ITEM_SOLD_OUT", Map.of("name", name), name + " is sold out.");
            }
            if (v.available() < qty) {
                throw new ConflictException("ITEM_LOW_STOCK", Map.of("name", name, "n", v.available()), "Only " + v.available() + " left of " + name + ".");
            }
            PricingService.PricedLine priced = pricing.price(v, offers.get(v.getSku()), customer, qty, collection.tierDiscountPct());
            OrderItem line = new OrderItem(order, v, qty, priced.listPrice(), priced.discountPct(), priced.unitPrice(), priced.sessionId(),
                    name, v.getProduct().getSlug(), CartService.label(v), pictures.get(v.getSku()));
            line.recordReason(priced.tierDiscountPct(), priced.source(), priced.capped());
            order.addItem(line);
            v.reserve(qty);
        }
        if (order.getTotal().signum() <= 0) {
            throw new BusinessRuleException("NOTHING_TO_PAY", Map.of(), "There is nothing to pay for in this order.");
        }
        if (zone != null) {
            order.deliverIn(zone.getId(), zone.getName(), zone.feeFor(order.getTotal()), zone.getDaysMin(), zone.getDaysMax(), zone.getKind(), zone.isPayOnReceipt());
        }

        try {
            orders.saveAndFlush(order);
        } catch (DataIntegrityViolationException e) {
            String cause = String.valueOf(e.getMostSpecificCause().getMessage()).toLowerCase();
            boolean offer = cause.contains("negotiation");
            throw new ConflictException(offer ? "OFFER_USED" : "ORDER_IN_PROGRESS", Map.of(), offer ? "That offer has already been used."
                    : "This order is already being processed. Please wait a moment and check your orders.");
        }
        audit(customerEmail, "ORDER_PLACED", order, null);

        if (!method.online()) {
            // Pay at handover: the pairs stay held (reserved) until the customer pays the team; nothing is sold yet.
            order.reserve(java.time.Instant.now().plus(java.time.Duration.ofHours(reservationHours)));
            if (order.getFulfillmentMethod() == FulfillmentMethod.PICKUP) {
                order.givePickupCode(pickupCodes.next());
            }
            orders.save(order);
            audit(customerEmail, "ORDER_RESERVED", order, Map.of("status", "PENDING"));
            notifier.orderConfirmed(order);
            return new CheckoutResult(forCustomer(order), false);
        }

        PaymentResult result;
        try {
            result = payments.charge(new PaymentRequest(method, request.payment().token(), order.getTotal(), order.getReference()));
        } catch (PaymentUnavailableException e) {
            OrderView failed = failOrder(customerEmail, order);
            throw new PaymentFailedException(502, "PAYMENT_UNREACHABLE", "We could not reach the payment service. You have not been charged.", failed);
        }
        if (!result.approved()) {
            OrderView failed = failOrder(customerEmail, order);
            throw new PaymentFailedException(402, "PAYMENT_DECLINED", result.declineReason(), failed);
        }

        order.markPaid(method.name(), result.reference());
        if (order.getFulfillmentMethod() == FulfillmentMethod.PICKUP) {
            order.givePickupCode(pickupCodes.next());
        }
        sell(order.getItems(), order);
        orders.save(order);
        audit(customerEmail, "ORDER_PAID", order, Map.of("status", "PENDING"));
        notifier.orderConfirmed(order);
        return new CheckoutResult(forCustomer(order), false);
    }

    /**
     * The held pairs are sold: off the shelf, into the ledger, and a sock that this sale takes from above the
     * "few left" level to at or below it is news for the owners. {@code items} must belong to variants locked by the
     * caller (checkout locks them; handover locks them here first).
     */
    private void sell(List<OrderItem> items, Order order) {
        int fewLeft = collections.policy().getFewLeftThreshold();
        List<Variant> crossed = new ArrayList<>();
        for (OrderItem item : items) {
            Variant v = item.getVariant();
            v.commitSale(item.getQuantity());
            ledger.record(v, -item.getQuantity(), StockReason.SALE, order.getId(), null, null);
            if (v.available() <= fewLeft && v.available() + item.getQuantity() > fewLeft) crossed.add(v);
        }
        notifier.lowStock(order, crossed, fewLeft);
    }

    /** A reserved order is paid at handover: lock its variants (as checkout does), sell, and close the order. */
    private void payAtHandover(Order o) {
        variants.lockByIdIn(o.getItems().stream().map(i -> i.getVariant().getId()).collect(Collectors.toSet()));
        sell(o.getItems(), o);
        o.handOverPaid();
    }

    /** The order as the customer sees it; a guest also gets the token of the private link (it is never stored). */
    private OrderView forCustomer(Order o) {
        OrderView v = OrderMapper.toView(o, false);
        return o.isGuest() ? v.withAccessToken(links.tokenFor(o.getId())) : v;
    }

    private static String guestEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new BusinessRuleException("GUEST_EMAIL_REQUIRED", Map.of(), "Enter your email: the confirmation and the link to your order go there.");
        }
        return email.strip().toLowerCase(java.util.Locale.ROOT);
    }

    /** Audited as the account that acted, or as a guest (no account). */
    private void audit(String actorEmail, String action, Order o, Object before) {
        if (actorEmail == null) audit.recordAsGuest(action, "ORDER", o.getId(), before, snapshot(o));
        else audit.record(actorEmail, action, "ORDER", o.getId(), before, snapshot(o));
    }

    private CheckoutResult replay(Order existing) {
        if (existing.getStatus() == OrderStatus.CANCELLED) {
            throw new PaymentFailedException(402, "PAYMENT_START_AGAIN", "That payment did not go through. Please start a new checkout.", OrderMapper.toView(existing, false));
        }
        return new CheckoutResult(forCustomer(existing), true);
    }

    private OrderView failOrder(String actorEmail, Order order) {
        for (OrderItem item : order.getItems()) {
            item.getVariant().releaseReservation(item.getQuantity());
        }
        order.cancel();
        orders.save(order);
        audit(actorEmail, "ORDER_PAYMENT_FAILED", order, Map.of("status", "PENDING"));
        return OrderMapper.toView(order, false);
    }

    // ---- customer: own orders ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<OrderView> myOrders(String customerEmail) {
        User customer = requireUser(customerEmail);
        return orders.findByCustomerIdOrderByCreatedAtDesc(customer.getId()).stream().map(o -> OrderMapper.toView(o, false)).toList();
    }

    /**
     * The customer's own order: their account's, or any order whose private link they hold (token). An order that
     * belongs to someone else looks exactly like one that does not exist.
     */
    @Transactional(readOnly = true)
    public OrderView myOrder(String customerEmail, UUID orderId, String token) {
        Order o = orders.findById(orderId).filter(x -> mayOpen(x, customerEmail, token))
                .orElseThrow(() -> new NotFoundException("Order not found."));
        return OrderMapper.toView(o, false);
    }

    @Transactional
    public OrderView cancelMine(String customerEmail, UUID orderId, String token) {
        return cancel(customerEmail, orderId, false, token);
    }

    private boolean mayOpen(Order o, String userEmail, String token) {
        boolean owner = userEmail != null && o.getCustomer() != null && o.getCustomer().getEmail().equals(userEmail);
        return owner || links.opens(o.getId(), token);
    }

    /**
     * "I lost the link": when the email and the reference belong to one order, the link goes to that email again. The
     * answer is the same either way, so the form tells nobody which emails or orders exist.
     */
    @Transactional
    public void sendLinkAgain(OrderDtos.FindRequest r) {
        String email = r.email().strip().toLowerCase(java.util.Locale.ROOT);
        String reference = r.reference().strip().toUpperCase(java.util.Locale.ROOT);
        List<Order> candidates = new ArrayList<>(orders.findByGuestEmail(email));
        users.findByEmail(email).ifPresent(u -> candidates.addAll(orders.findByCustomerIdOrderByCreatedAtDesc(u.getId())));
        candidates.stream().filter(o -> o.getReference().equals(reference)).findFirst().ifPresent(notifier::orderLink);
    }

    // ---- staff ------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public PageResponse<OrderView> list(OrderStatus status, int page, int size) {
        return list(status, null, null, page, size);
    }

    /**
     * q: part of the order number (AV-1234ABCD), a name, a phone or an email. way: PICKUP, COURIER or CARGO.
     */
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public PageResponse<OrderView> list(OrderStatus status, String q, String way, int page, int size) {
        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> all = new ArrayList<>();
            if (status != null) all.add(cb.equal(root.get("status"), status));
            if ("PICKUP".equals(way)) all.add(cb.equal(root.get("fulfillmentMethod"), FulfillmentMethod.PICKUP));
            else if ("COURIER".equals(way) || "CARGO".equals(way)) {
                all.add(cb.equal(root.get("fulfillmentMethod"), FulfillmentMethod.DELIVERY));
                all.add(cb.equal(root.get("deliveryKind"), com.akven.thesis.delivery.DeliveryKind.valueOf(way)));
            }
            if (q != null && !q.isBlank()) {
                String text = q.strip().toLowerCase(java.util.Locale.ROOT).replaceFirst("^av-", "").replace("%", "").replace("_", "");
                String like = "%" + text + "%";
                var customer = root.join("customer", jakarta.persistence.criteria.JoinType.LEFT);
                all.add(cb.or(
                        cb.like(cb.lower(root.get("id").as(String.class)), text + "%"),
                        cb.like(cb.lower(root.get("contactName")), like),
                        cb.like(cb.lower(root.get("contactPhone")), like),
                        cb.like(cb.lower(root.get("guestEmail")), like),
                        cb.like(cb.lower(customer.get("email")), like)));
            }
            return cb.and(all.toArray(new Predicate[0]));
        };
        Page<Order> found = orders.findAll(spec, PageRequest.of(Math.max(page, 0), size <= 0 ? 20 : Math.min(size, 100), Sort.by(Sort.Order.desc("createdAt"))));
        return PageResponse.of(found, o -> OrderMapper.toView(o, true));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public OrderView get(UUID orderId) {
        return OrderMapper.toView(orders.findById(orderId).orElseThrow(() -> new NotFoundException("Order not found.")), true);
    }

    /**
     * At the stall: the customer says the pickup code and the last four digits of their phone. A wrong code and a wrong
     * phone give the same answer, so neither can be guessed separately.
     */
    @Transactional
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public OrderView handOver(String actorEmail, String code, String phoneEnd) {
        Order found = orders.findByPickupCodeAndStatusIn(code, List.of(OrderStatus.PAID, OrderStatus.RESERVED))
                .filter(x -> x.getContactPhone() != null && x.getContactPhone().replaceAll("[^0-9]", "").endsWith(phoneEnd))
                .orElseThrow(() -> new NotFoundException("No order waiting for pickup matches this code and phone number."));
        Order o = orders.lockById(found.getId()).orElseThrow();
        OrderStatus before = o.getStatus();
        if (before == OrderStatus.RESERVED) payAtHandover(o);         // the team took the money just now
        else o.fulfil();
        orders.save(o);
        audit.record(actorEmail, "ORDER_HANDED_OVER", "ORDER", o.getId(), Map.of("status", before), snapshot(o));
        notifier.orderHandedOver(o);
        return OrderMapper.toView(o, true);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public OrderView fulfil(String actorEmail, UUID orderId) {
        Order o = orders.lockById(orderId).orElseThrow(() -> new NotFoundException("Order not found."));
        OrderStatus before = o.getStatus();
        if (before == OrderStatus.RESERVED) payAtHandover(o);         // paid to the courier, or at the stall
        else o.fulfil();
        orders.save(o);
        audit.record(actorEmail, "ORDER_FULFILLED", "ORDER", o.getId(), Map.of("status", before), snapshot(o));
        notifier.orderHandedOver(o);
        return OrderMapper.toView(o, true);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public OrderView cancelAsStaff(String actorEmail, UUID orderId) {
        return cancel(actorEmail, orderId, true, null);
    }

    /**
     * Reservations nobody collected in time are cancelled: their pairs go back on the shelf and the customer hears
     * so. Each order is locked and checked again, so a handover at the same moment wins and is never undone.
     * Returns how many ended.
     */
    @Transactional
    public int expireReservations(java.time.Instant now) {
        int ended = 0;
        for (Order due : orders.findByStatusAndReservedUntilBefore(OrderStatus.RESERVED, now)) {
            Order o = orders.lockById(due.getId()).orElse(null);
            if (o == null || o.getStatus() != OrderStatus.RESERVED || !o.getReservedUntil().isBefore(now)) continue;
            o.cancel();
            List<Variant> locked = variants.lockByIdIn(o.getItems().stream().map(i -> i.getVariant().getId()).collect(Collectors.toSet()));
            Map<UUID, Variant> byId = locked.stream().collect(Collectors.toMap(Variant::getId, v -> v));
            for (OrderItem item : o.getItems()) byId.get(item.getVariant().getId()).releaseReservation(item.getQuantity());
            orders.save(o);
            audit.recordAsGuest("ORDER_RESERVATION_EXPIRED", "ORDER", o.getId(), Map.of("status", OrderStatus.RESERVED), snapshot(o));   // no person: the clock
            notifier.reservationExpired(o);
            ended++;
        }
        return ended;
    }

    // ---- shared -----------------------------------------------------------------------------

    /**
     * PENDING: give back the hold. PAID: refund through the provider and put the units back on the shelf.
     * FULFILLED and CANCELLED orders cannot be cancelled (Order.cancel refuses). If the refund fails, the whole
     * transaction rolls back and the order stays as it was.
     */
    private OrderView cancel(String actorEmail, UUID orderId, boolean asStaff, String token) {
        Order o = orders.lockById(orderId).orElseThrow(() -> new NotFoundException("Order not found."));
        if (!asStaff && !mayOpen(o, actorEmail, token)) {
            throw new NotFoundException("Order not found.");
        }
        OrderStatus before = o.getStatus();
        o.cancel();                                                     // throws 409 for FULFILLED / CANCELLED
        List<Variant> locked = variants.lockByIdIn(o.getItems().stream().map(i -> i.getVariant().getId()).collect(Collectors.toSet()));
        Map<UUID, Variant> byId = locked.stream().collect(Collectors.toMap(Variant::getId, v -> v));
        for (OrderItem item : o.getItems()) {
            Variant v = byId.get(item.getVariant().getId());
            if (before == OrderStatus.PENDING || before == OrderStatus.RESERVED) v.releaseReservation(item.getQuantity());
            else {
                v.restock(item.getQuantity());
                ledger.record(v, item.getQuantity(), StockReason.CANCELLED, o.getId(), actorEmail, null);
            }
        }
        if (before == OrderStatus.PAID) {
            try {
                payments.refund(PaymentMethod.valueOf(o.getPaymentMethod()), o.getPaymentRef(), o.getTotal());
            } catch (PaymentUnavailableException e) {
                throw new PaymentFailedException(502, "REFUND_UNREACHABLE", "The refund could not be made right now, so the order was not cancelled. Please try again shortly.", null);
            }
        }
        orders.save(o);
        audit(actorEmail, "ORDER_CANCELLED", o, Map.of("status", before));
        if (before == OrderStatus.PAID) notifier.orderCancelled(o, asStaff);
        if (before == OrderStatus.RESERVED) notifier.reservationCancelled(o, asStaff);
        return OrderMapper.toView(o, asStaff);
    }

    private User requireUser(String email) {
        return users.findByEmail(email).orElseThrow(() -> new NotFoundException("Account not found."));
    }

    private static Map<String, Object> snapshot(Order o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("reference", o.getReference());
        m.put("status", o.getStatus());
        m.put("total", o.getTotal());
        if (o.getDeliveryZoneName() != null) m.put("delivery", o.getDeliveryZoneName() + " " + o.getDeliveryFee());
        m.put("items", o.getItems().stream().map(i -> i.getSku() + " x" + i.getQuantity() + " @ " + i.getUnitPrice()).toList());
        return m;
    }

    /**
     * Words for the gift card: trimmed, with control characters (other than line breaks) removed and never more than one
     * empty line in a row, since the family copies them onto a small card by hand. Empty means none.
     */
    static String cardText(String s) {
        if (s == null) return null;
        String clean = s.replace("\r\n", "\n").replaceAll("[\\p{Cc}&&[^\n]]", "").replaceAll("\n{3,}", "\n\n").strip();
        return clean.isEmpty() ? null : clean;
    }

    /** Trims and normalises the free-text fulfilment fields once. */
    private static final class FulfillmentInputs {
        final FulfillmentMethod method;
        final String name, phone, address, note;
        final Country country;

        FulfillmentInputs(CheckoutRequest r) {
            method = r.fulfillment().method();
            name = r.fulfillment().contactName().trim();
            phone = r.fulfillment().contactPhone().trim();
            address = method == FulfillmentMethod.DELIVERY ? r.fulfillment().address().trim() : null;
            note = r.fulfillment().note() == null || r.fulfillment().note().isBlank() ? null : r.fulfillment().note().trim();
            // Most deliveries stay in Kyrgyzstan; the shop also sends to Kazakhstan, Uzbekistan and Russia.
            country = method != FulfillmentMethod.DELIVERY ? null : r.fulfillment().country() == null ? Country.KG : r.fulfillment().country();
        }
    }
}
