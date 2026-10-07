package com.akven.thesis.negotiation;

import com.akven.thesis.catalog.CatalogService;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.negotiation.NegotiationStats.Day;
import com.akven.thesis.negotiation.NegotiationStats.SourceCount;
import com.akven.thesis.negotiation.NegotiationStats.TopItem;
import com.akven.thesis.negotiation.NegotiationStats.Totals;
import com.akven.thesis.order.DiscountSource;
import com.akven.thesis.order.OrderItem;
import com.akven.thesis.order.OrderItemRepository;
import com.akven.thesis.order.OrderStatus;
import com.akven.thesis.pricing.CollectionPricing;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Numbers for the owners' dashboard over the last N days. A small shop has a few hundred offers a month, so the
 * figures are worked out here in plain Java, which reads the same on H2 and Postgres.
 */
@Service
public class NegotiationStatsService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final NegotiationSessionRepository sessions;
    private final OrderItemRepository orderItems;

    public NegotiationStatsService(NegotiationSessionRepository sessions, OrderItemRepository orderItems) {
        this.sessions = sessions;
        this.orderItems = orderItems;
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional(readOnly = true)
    public NegotiationStats stats(int days) {
        if (days < 1 || days > 365) {
            throw new BusinessRuleException("Choose between 1 and 365 days.");
        }
        LocalDate today = LocalDate.now(CatalogService.SHOP_ZONE);
        LocalDate first = today.minusDays(days - 1L);
        Instant since = first.atStartOfDay(CatalogService.SHOP_ZONE).toInstant();

        List<NegotiationSession> offers = sessions.findByCreatedAtGreaterThanEqual(since).stream()
                .filter(s -> s.getValidatedDiscountPct() != null).toList();
        List<OrderItem> sold = orderItems.findSoldSince(List.of(OrderStatus.PAID, OrderStatus.FULFILLED), since);
        Set<UUID> used = sold.stream().map(OrderItem::getNegotiationSessionId).filter(Objects::nonNull).collect(Collectors.toSet());

        Map<LocalDate, List<NegotiationSession>> byDay = new LinkedHashMap<>();
        for (LocalDate d = first; !d.isAfter(today); d = d.plusDays(1)) byDay.put(d, new ArrayList<>());
        for (NegotiationSession s : offers) {
            LocalDate d = LocalDate.ofInstant(s.getCreatedAt(), CatalogService.SHOP_ZONE);
            byDay.computeIfAbsent(d, k -> new ArrayList<>()).add(s);
        }
        List<Day> perDay = byDay.entrySet().stream().map(e -> new Day(e.getKey(), e.getValue().size(), limited(e.getValue()),
                average(e.getValue().stream().map(NegotiationSession::getValidatedDiscountPct).toList()),
                (int) e.getValue().stream().filter(s -> used.contains(s.getId())).count())).toList();

        int usedCount = (int) offers.stream().filter(s -> used.contains(s.getId())).count();
        BigDecimal negotiatedRevenue = sold.stream().filter(i -> i.getDiscountSource() == DiscountSource.NEGOTIATED)
                .map(OrderItem::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        Totals totals = new Totals(offers.size(), limited(offers), percent(limited(offers), offers.size()),
                average(offers.stream().map(NegotiationSession::getProposedDiscountPct).filter(Objects::nonNull).toList()),
                average(offers.stream().map(NegotiationSession::getValidatedDiscountPct).toList()),
                usedCount, percent(usedCount, offers.size()), negotiatedRevenue);

        return new NegotiationStats(days, perDay, totals, topItems(sold), sources(sold));
    }

    private static int limited(List<NegotiationSession> offers) {
        return (int) offers.stream().filter(s -> s.getProposedDiscountPct() != null
                && s.getValidatedDiscountPct().compareTo(s.getProposedDiscountPct()) < 0).count();
    }

    private static List<TopItem> topItems(List<OrderItem> sold) {
        Map<String, TopItem> bySku = new LinkedHashMap<>();
        for (OrderItem i : sold) {
            int pairs = CollectionPricing.pairs(i.getVariant(), i.getQuantity());
            bySku.merge(i.getSku(), new TopItem(i.getSku(), i.getProductName(), pairs, i.lineTotal()),
                    (a, b) -> new TopItem(a.sku(), a.productName(), a.pairsSold() + b.pairsSold(), a.revenue().add(b.revenue())));
        }
        return bySku.values().stream().sorted(Comparator.comparingInt(TopItem::pairsSold).reversed().thenComparing(TopItem::sku))
                .limit(5).toList();
    }

    private static List<SourceCount> sources(List<OrderItem> sold) {
        Map<DiscountSource, Integer> counts = new EnumMap<>(DiscountSource.class);
        for (DiscountSource s : DiscountSource.values()) counts.put(s, 0);
        for (OrderItem i : sold) counts.merge(i.getDiscountSource(), 1, Integer::sum);
        return counts.entrySet().stream().map(e -> new SourceCount(e.getKey(), e.getValue())).toList();
    }

    private static BigDecimal average(List<BigDecimal> values) {
        if (values.isEmpty()) return null;
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal percent(int part, int whole) {
        return whole == 0 ? null : BigDecimal.valueOf(part).multiply(HUNDRED).divide(BigDecimal.valueOf(whole), 1, RoundingMode.HALF_UP);
    }
}
