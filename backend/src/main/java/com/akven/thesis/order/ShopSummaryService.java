package com.akven.thesis.order;

import com.akven.thesis.catalog.CatalogService;
import com.akven.thesis.catalog.Product;
import com.akven.thesis.catalog.ProductRepository;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.catalog.VariantRepository;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.pricing.CollectionPricing;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The shop at a glance for the team: what was sold in the last N days, how many paid orders still wait to be handed
 * over, and which socks are running out, so the owners know what to reorder from Korea before a customer finds the
 * shelf empty. Worked out in plain Java (a family shop has hundreds of orders, not millions), the same on H2 and Postgres.
 */
@Service
public class ShopSummaryService {

    /** How many running-out lines the dashboard lists. */
    static final int LOW_STOCK_LINES = 12;

    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final ProductRepository products;
    private final VariantRepository variants;
    private final CollectionPricing pricing;

    public ShopSummaryService(OrderRepository orders, OrderItemRepository orderItems, ProductRepository products,
                              VariantRepository variants, CollectionPricing pricing) {
        this.orders = orders;
        this.orderItems = orderItems;
        this.products = products;
        this.variants = variants;
        this.pricing = pricing;
    }

    public record Sales(int orders, BigDecimal revenue, int pairs, BigDecimal averageOrder) {}

    public record LowStockLine(UUID productId, String slug, String productName, String sku, String color, String size, int available,
                               int incoming, LocalDate restockEta) {}

    public record ShopSummary(int days, Sales sales, int toHandOver, int fewLeftThreshold, int soldOut,
                              List<LowStockLine> lowStock, Insights insights) {}

    /** A slice of the period's sales: how many orders and how much money. */
    public record Share(String key, int orders, BigDecimal revenue) {}

    public record TopCustomer(String name, String email, boolean guest, int orders, BigDecimal spent) {}

    /** A product among the period's best sellers: pairs sold and the money they brought, as recorded on the orders. */
    public record TopProduct(String name, String slug, int pairs, BigDecimal revenue) {}

    /**
     * What the period's paid orders say: how they travelled, which shelves sold, who bought most, how many came back,
     * how many were guests, how many reached a price step, pairs per order, the busiest weekdays (Monday first), and
     * the best-selling products by pairs.
     */
    public record Insights(List<Share> ways, List<Share> shelves, List<TopCustomer> topCustomers, int returningCustomers,
                           int guestOrders, int cancelled, int ladderOrders, BigDecimal averagePairs, int[] weekdays,
                           List<TopProduct> topProducts) {}

    /** One day of sales in Bishkek time: paid orders, their total, and pairs. */
    public record DayPoint(LocalDate date, int orders, BigDecimal revenue, int pairs) {}

    /** Sales per day for the last N days, every day present (zero when nothing sold), oldest first, for the chart. */
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional(readOnly = true)
    public List<DayPoint> daily(int days) {
        if (days < 1 || days > 365) throw new BusinessRuleException("Choose between 1 and 365 days.");
        LocalDate today = LocalDate.now(CatalogService.SHOP_ZONE);
        Instant since = today.minusDays(days - 1L).atStartOfDay(CatalogService.SHOP_ZONE).toInstant();
        List<OrderItem> sold = orderItems.findSoldSince(List.of(OrderStatus.PAID, OrderStatus.FULFILLED), since);
        Map<LocalDate, List<OrderItem>> byDay = sold.stream()
                .collect(Collectors.groupingBy(i -> i.getOrder().getPaidAt().atZone(CatalogService.SHOP_ZONE).toLocalDate()));
        List<DayPoint> out = new java.util.ArrayList<>();
        for (int d = days - 1; d >= 0; d--) {
            LocalDate date = today.minusDays(d);
            List<OrderItem> lines = byDay.getOrDefault(date, List.of());
            Map<UUID, Order> dayOrders = lines.stream().map(OrderItem::getOrder).collect(Collectors.toMap(Order::getId, Function.identity(), (a, b) -> a));
            out.add(new DayPoint(date, dayOrders.size(),
                    dayOrders.values().stream().map(Order::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add),
                    lines.stream().mapToInt(i -> CollectionPricing.pairs(i.getVariant(), i.getQuantity())).sum()));
        }
        return out;
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional(readOnly = true)
    public ShopSummary summary(int days) {
        if (days < 1 || days > 365) throw new BusinessRuleException("Choose between 1 and 365 days.");
        Instant since = LocalDate.now(CatalogService.SHOP_ZONE).minusDays(days - 1L).atStartOfDay(CatalogService.SHOP_ZONE).toInstant();

        List<OrderItem> sold = orderItems.findSoldSince(List.of(OrderStatus.PAID, OrderStatus.FULFILLED), since);
        Map<UUID, Order> paidOrders = sold.stream().map(OrderItem::getOrder)
                .collect(Collectors.toMap(Order::getId, Function.identity(), (a, b) -> a));
        BigDecimal revenue = paidOrders.values().stream().map(Order::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        int pairs = sold.stream().mapToInt(i -> CollectionPricing.pairs(i.getVariant(), i.getQuantity())).sum();
        BigDecimal average = paidOrders.isEmpty() ? null
                : revenue.divide(BigDecimal.valueOf(paidOrders.size()), 2, RoundingMode.HALF_UP);

        int threshold = pricing.policy().getFewLeftThreshold();
        List<UUID> live = products.findByActiveTrue().stream().map(Product::getId).toList();
        List<Variant> onSale = live.isEmpty() ? List.of() : variants.findByProductIdInAndActiveTrue(live);
        int soldOut = (int) onSale.stream().filter(v -> v.available() <= 0).count();
        List<LowStockLine> low = onSale.stream().filter(v -> v.available() <= threshold)
                .sorted(Comparator.comparingInt(Variant::available).thenComparing(Variant::getSku))
                .limit(LOW_STOCK_LINES)
                .map(v -> new LowStockLine(v.getProduct().getId(), v.getProduct().getSlug(), v.getProduct().getName(), v.getSku(), v.getColor(), v.getSize(),
                        Math.max(0, v.available()), v.getIncomingQty(), v.getRestockEta()))
                .toList();

        // Waiting for the team: paid orders, and reservations that will be paid at handover.
        int toHandOver = orders.findByStatus(OrderStatus.PAID).size() + orders.findByStatus(OrderStatus.RESERVED).size();
        return new ShopSummary(days, new Sales(paidOrders.size(), revenue, pairs, average), toHandOver, threshold, soldOut, low,
                insights(paidOrders.values(), sold, since, pairs));
    }

    private Insights insights(java.util.Collection<Order> paid, List<OrderItem> sold, Instant since, int pairs) {
        Map<String, List<Order>> byWay = paid.stream().collect(Collectors.groupingBy(o -> o.getFulfillmentMethod() == FulfillmentMethod.PICKUP ? "PICKUP"
                : o.getDeliveryKind() == com.akven.thesis.delivery.DeliveryKind.CARGO ? "CARGO" : "COURIER"));
        List<Share> ways = java.util.stream.Stream.of("PICKUP", "COURIER", "CARGO").map(k -> {
            List<Order> l = byWay.getOrDefault(k, List.of());
            return new Share(k, l.size(), l.stream().map(Order::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add));
        }).toList();

        Map<String, List<OrderItem>> byShelf = sold.stream().collect(Collectors.groupingBy(i -> i.getVariant().getProduct().getCategory().name()));
        List<Share> shelves = byShelf.entrySet().stream()
                .map(e -> new Share(e.getKey(), (int) e.getValue().stream().map(i -> i.getOrder().getId()).distinct().count(),
                        e.getValue().stream().map(OrderItem::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add)))
                .sorted(Comparator.comparing(Share::revenue).reversed()).toList();

        Map<String, List<Order>> byBuyer = paid.stream().collect(Collectors.groupingBy(Order::getContactEmail));
        List<TopCustomer> top = byBuyer.values().stream()
                .map(l -> new TopCustomer(l.get(0).getCustomer() != null && l.get(0).getCustomer().getDisplayName() != null
                        ? l.get(0).getCustomer().getDisplayName() : l.get(0).getContactName(), l.get(0).getContactEmail(), l.get(0).isGuest(),
                        l.size(), l.stream().map(Order::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add)))
                .sorted(Comparator.comparing(TopCustomer::spent).reversed()).limit(5).toList();
        int returning = (int) byBuyer.values().stream().filter(l -> l.size() > 1).count();
        int guests = (int) paid.stream().filter(Order::isGuest).count();
        int cancelled = (int) orders.findByStatus(OrderStatus.CANCELLED).stream()
                .filter(o -> o.getCreatedAt() != null && !o.getCreatedAt().isBefore(since) && o.getPaidAt() != null).count();
        int ladder = (int) sold.stream().filter(i -> i.getDiscountSource() == DiscountSource.TIER).map(i -> i.getOrder().getId()).distinct().count();
        BigDecimal avgPairs = paid.isEmpty() ? BigDecimal.ZERO : BigDecimal.valueOf(pairs).divide(BigDecimal.valueOf(paid.size()), 1, RoundingMode.HALF_UP);
        int[] weekdays = new int[7];
        paid.forEach(o -> weekdays[o.getPaidAt().atZone(CatalogService.SHOP_ZONE).getDayOfWeek().getValue() - 1]++);
        // Grouped by the product the line was sold as, so a product renamed later still counts as one.
        Map<UUID, List<OrderItem>> byProduct = sold.stream().collect(Collectors.groupingBy(i -> i.getVariant().getProduct().getId()));
        List<TopProduct> topProducts = byProduct.values().stream()
                .map(l -> new TopProduct(l.get(0).getProductName(), l.get(0).getProductSlug(),
                        l.stream().mapToInt(i -> CollectionPricing.pairs(i.getVariant(), i.getQuantity())).sum(),
                        l.stream().map(OrderItem::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add)))
                .sorted(Comparator.comparingInt(TopProduct::pairs).reversed().thenComparing(TopProduct::revenue, Comparator.reverseOrder()))
                .limit(5).toList();
        return new Insights(ways, shelves, top, returning, guests, cancelled, ladder, avgPairs, weekdays, topProducts);
    }
}
