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
                              List<LowStockLine> lowStock) {}

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

        int toHandOver = orders.findByStatus(OrderStatus.PAID).size();
        return new ShopSummary(days, new Sales(paidOrders.size(), revenue, pairs, average), toHandOver, threshold, soldOut, low);
    }
}
