package com.akven.thesis.order;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.catalog.ProductImageRepository;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.catalog.VariantRepository;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.ConflictException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.common.PageResponse;
import com.akven.thesis.order.OrderDtos.CartItem;
import com.akven.thesis.order.OrderDtos.CheckoutRequest;
import com.akven.thesis.order.OrderDtos.OrderView;
import com.akven.thesis.payment.PaymentMethod;
import com.akven.thesis.payment.PaymentRequest;
import com.akven.thesis.payment.PaymentResult;
import com.akven.thesis.payment.PaymentService;
import com.akven.thesis.payment.PaymentUnavailableException;
import com.akven.thesis.pricing.CollectionPricing;
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

    public OrderService(OrderRepository orders, VariantRepository variants, UserRepository users, PricingService pricing,
                        PaymentService payments, AuditService audit, ProductImageRepository images, CollectionPricing collections) {
        this.orders = orders;
        this.variants = variants;
        this.users = users;
        this.pricing = pricing;
        this.payments = payments;
        this.audit = audit;
        this.images = images;
        this.collections = collections;
    }

    private final ProductImageRepository images;

    public record CheckoutResult(OrderView order, boolean replayed) {}

    @Transactional(noRollbackFor = PaymentFailedException.class)
    public CheckoutResult checkout(String customerEmail, String idempotencyKey, CheckoutRequest request) {
        User customer = requireUser(customerEmail);

        Optional<Order> earlier = orders.findByCustomerIdAndIdempotencyKey(customer.getId(), idempotencyKey);
        if (earlier.isPresent()) {
            return replay(earlier.get());
        }

        Map<String, Integer> quantities = new LinkedHashMap<>();
        Map<String, UUID> offers = new LinkedHashMap<>();
        for (CartItem item : request.items()) {
            quantities.merge(item.sku(), item.quantity(), Integer::sum);
            if (item.negotiationSessionId() != null && offers.putIfAbsent(item.sku(), item.negotiationSessionId()) != null
                    && !offers.get(item.sku()).equals(item.negotiationSessionId())) {
                throw new BusinessRuleException("Only one negotiated offer can be used per item.");
            }
        }
        if (request.fulfillment().method() == FulfillmentMethod.DELIVERY
                && (request.fulfillment().address() == null || request.fulfillment().address().isBlank())) {
            throw new BusinessRuleException("Enter a delivery address, or choose pickup.");
        }

        // Lock first, then look at stock: this is what makes the last-pair race safe.
        List<Variant> locked = variants.lockBySkuIn(quantities.keySet());
        Set<String> found = locked.stream().map(Variant::getSku).collect(Collectors.toSet());
        Set<String> missing = new TreeSet<>(quantities.keySet());
        missing.removeAll(found);
        if (!missing.isEmpty()) {
            throw new BusinessRuleException("Some items are no longer in the shop: " + String.join(", ", missing) + ".");
        }

        // The cart is one collection: the minimum and the price tier count pairs across all lines.
        Map<Variant, Integer> byVariant = new LinkedHashMap<>();
        for (Variant v : locked) byVariant.put(v, quantities.get(v.getSku()));
        CollectionPricing.Collection collection = collections.evaluate(byVariant, customer);
        if (collection.belowMinimum()) {
            throw new BusinessRuleException(collection.minimumMessage());
        }

        FulfillmentInputs f = new FulfillmentInputs(request);
        Order order = new Order(customer, idempotencyKey);
        order.setFulfillment(f.method, f.name, f.phone, f.address, f.note);
        Map<String, String> cover = coverImages(locked);
        for (Variant v : locked) {
            int qty = quantities.get(v.getSku());
            String name = v.getProduct().getName();
            if (!v.isActive() || !v.getProduct().isActive()) {
                throw new ConflictException(name + " is no longer available.");
            }
            if (v.available() <= 0) {
                throw new ConflictException(name + " is sold out.");
            }
            if (v.available() < qty) {
                throw new ConflictException("Only " + v.available() + " left of " + name + ".");
            }
            PricingService.PricedLine priced = pricing.price(v, offers.get(v.getSku()), customer, qty, collection.tierDiscountPct());
            OrderItem line = new OrderItem(order, v, qty, priced.listPrice(), priced.discountPct(), priced.unitPrice(), priced.sessionId(),
                    name, v.getProduct().getSlug(), CartService.label(v), cover.get(v.getProduct().getId().toString()));
            line.recordReason(priced.tierDiscountPct(), priced.source(), priced.capped());
            order.addItem(line);
            v.reserve(qty);
        }
        if (order.getTotal().signum() <= 0) {
            throw new BusinessRuleException("There is nothing to pay for in this order.");
        }

        try {
            orders.saveAndFlush(order);
        } catch (DataIntegrityViolationException e) {
            String cause = String.valueOf(e.getMostSpecificCause().getMessage()).toLowerCase();
            throw new ConflictException(cause.contains("negotiation") ? "That offer has already been used."
                    : "This order is already being processed. Please wait a moment and check your orders.");
        }
        audit.record(customerEmail, "ORDER_PLACED", "ORDER", order.getId(), null, snapshot(order));

        PaymentMethod method = request.payment().method();
        PaymentResult result;
        try {
            result = payments.charge(new PaymentRequest(method, request.payment().token(), order.getTotal(), order.getReference()));
        } catch (PaymentUnavailableException e) {
            OrderView failed = failOrder(customerEmail, order);
            throw new PaymentFailedException(502, "We could not reach the payment service. You have not been charged.", failed);
        }
        if (!result.approved()) {
            OrderView failed = failOrder(customerEmail, order);
            throw new PaymentFailedException(402, result.declineReason(), failed);
        }

        order.markPaid(method.name(), result.reference());
        for (OrderItem item : order.getItems()) {
            item.getVariant().commitSale(item.getQuantity());
        }
        orders.save(order);
        audit.record(customerEmail, "ORDER_PAID", "ORDER", order.getId(), Map.of("status", "PENDING"), snapshot(order));
        return new CheckoutResult(OrderMapper.toView(order, false), false);
    }

    private CheckoutResult replay(Order existing) {
        if (existing.getStatus() == OrderStatus.CANCELLED) {
            throw new PaymentFailedException(402, "That payment did not go through. Please start a new checkout.", OrderMapper.toView(existing, false));
        }
        return new CheckoutResult(OrderMapper.toView(existing, false), true);
    }

    private OrderView failOrder(String actorEmail, Order order) {
        for (OrderItem item : order.getItems()) {
            item.getVariant().releaseReservation(item.getQuantity());
        }
        order.cancel();
        orders.save(order);
        audit.record(actorEmail, "ORDER_PAYMENT_FAILED", "ORDER", order.getId(), Map.of("status", "PENDING"), snapshot(order));
        return OrderMapper.toView(order, false);
    }

    // ---- customer: own orders ---------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<OrderView> myOrders(String customerEmail) {
        User customer = requireUser(customerEmail);
        return orders.findByCustomerIdOrderByCreatedAtDesc(customer.getId()).stream().map(o -> OrderMapper.toView(o, false)).toList();
    }

    /** An order that belongs to someone else looks exactly like one that does not exist. */
    @Transactional(readOnly = true)
    public OrderView myOrder(String customerEmail, UUID orderId) {
        Order o = orders.findById(orderId).filter(x -> x.getCustomer().getEmail().equals(customerEmail))
                .orElseThrow(() -> new NotFoundException("Order not found."));
        return OrderMapper.toView(o, false);
    }

    @Transactional
    public OrderView cancelMine(String customerEmail, UUID orderId) {
        return cancel(customerEmail, orderId, false);
    }

    // ---- staff ------------------------------------------------------------------------------

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public PageResponse<OrderView> list(OrderStatus status, int page, int size) {
        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> all = new ArrayList<>();
            if (status != null) all.add(cb.equal(root.get("status"), status));
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

    @Transactional
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public OrderView fulfil(String actorEmail, UUID orderId) {
        Order o = orders.lockById(orderId).orElseThrow(() -> new NotFoundException("Order not found."));
        o.fulfil();
        orders.save(o);
        audit.record(actorEmail, "ORDER_FULFILLED", "ORDER", o.getId(), Map.of("status", "PAID"), snapshot(o));
        return OrderMapper.toView(o, true);
    }

    @Transactional
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public OrderView cancelAsStaff(String actorEmail, UUID orderId) {
        return cancel(actorEmail, orderId, true);
    }

    // ---- shared -----------------------------------------------------------------------------

    /**
     * PENDING: give back the hold. PAID: refund through the provider and put the units back on the shelf.
     * FULFILLED and CANCELLED orders cannot be cancelled (Order.cancel refuses). If the refund fails, the whole
     * transaction rolls back and the order stays as it was.
     */
    private OrderView cancel(String actorEmail, UUID orderId, boolean asStaff) {
        Order o = orders.lockById(orderId).orElseThrow(() -> new NotFoundException("Order not found."));
        if (!asStaff && !o.getCustomer().getEmail().equals(actorEmail)) {
            throw new NotFoundException("Order not found.");
        }
        OrderStatus before = o.getStatus();
        o.cancel();                                                     // throws 409 for FULFILLED / CANCELLED
        List<Variant> locked = variants.lockByIdIn(o.getItems().stream().map(i -> i.getVariant().getId()).collect(Collectors.toSet()));
        Map<UUID, Variant> byId = locked.stream().collect(Collectors.toMap(Variant::getId, v -> v));
        for (OrderItem item : o.getItems()) {
            Variant v = byId.get(item.getVariant().getId());
            if (before == OrderStatus.PENDING) v.releaseReservation(item.getQuantity());
            else v.restock(item.getQuantity());
        }
        if (before == OrderStatus.PAID) {
            try {
                payments.refund(PaymentMethod.valueOf(o.getPaymentMethod()), o.getPaymentRef(), o.getTotal());
            } catch (PaymentUnavailableException e) {
                throw new PaymentFailedException(502, "The refund could not be made right now, so the order was not cancelled. Please try again shortly.", null);
            }
        }
        orders.save(o);
        audit.record(actorEmail, "ORDER_CANCELLED", "ORDER", o.getId(), Map.of("status", before), snapshot(o));
        return OrderMapper.toView(o, asStaff);
    }

    private Map<String, String> coverImages(List<Variant> vs) {
        Set<UUID> ids = vs.stream().map(v -> v.getProduct().getId()).collect(Collectors.toSet());
        Map<String, String> cover = new LinkedHashMap<>();
        images.findByProductIdInOrderByPositionAsc(ids).forEach(i -> cover.putIfAbsent(i.getProductId().toString(), i.getUrl()));
        return cover;
    }

    private User requireUser(String email) {
        return users.findByEmail(email).orElseThrow(() -> new NotFoundException("Account not found."));
    }

    private static Map<String, Object> snapshot(Order o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("reference", o.getReference());
        m.put("status", o.getStatus());
        m.put("total", o.getTotal());
        m.put("items", o.getItems().stream().map(i -> i.getSku() + " x" + i.getQuantity() + " @ " + i.getUnitPrice()).toList());
        return m;
    }

    /** Trims and normalises the free-text fulfilment fields once. */
    private static final class FulfillmentInputs {
        final FulfillmentMethod method;
        final String name, phone, address, note;

        FulfillmentInputs(CheckoutRequest r) {
            method = r.fulfillment().method();
            name = r.fulfillment().contactName().trim();
            phone = r.fulfillment().contactPhone().trim();
            address = method == FulfillmentMethod.DELIVERY ? r.fulfillment().address().trim() : null;
            note = r.fulfillment().note() == null || r.fulfillment().note().isBlank() ? null : r.fulfillment().note().trim();
        }
    }
}
