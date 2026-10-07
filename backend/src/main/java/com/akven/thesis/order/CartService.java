package com.akven.thesis.order;

import com.akven.thesis.catalog.ProductImage;
import com.akven.thesis.catalog.ProductImageRepository;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.catalog.VariantRepository;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.order.OrderDtos.CartItem;
import com.akven.thesis.order.OrderDtos.CollectionView;
import com.akven.thesis.order.OrderDtos.LineProblem;
import com.akven.thesis.order.OrderDtos.NextTierView;
import com.akven.thesis.order.OrderDtos.Quote;
import com.akven.thesis.order.OrderDtos.QuoteLine;
import com.akven.thesis.pricing.CollectionPricing;
import com.akven.thesis.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Turns the client's cart (kept in the browser, so it works offline and needs no account) into current prices, names,
 * photos and availability. Nothing here changes stock. Checkout repeats the same pricing under locks, so this is a
 * faithful preview, never a promise.
 */
@Service
@Transactional(readOnly = true)
public class CartService {

    private final VariantRepository variants;
    private final ProductImageRepository images;
    private final PricingService pricing;
    private final CollectionPricing collections;

    public CartService(VariantRepository variants, ProductImageRepository images, PricingService pricing, CollectionPricing collections) {
        this.variants = variants;
        this.images = images;
        this.pricing = pricing;
        this.collections = collections;
    }

    /** customer is null for a visitor who is not signed in: listed prices only, no negotiated offers. */
    public Quote quote(List<CartItem> items, User customer) {
        Map<String, Variant> bySku = variants.findBySkuIn(items.stream().map(CartItem::sku).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Variant::getSku, v -> v));
        Set<UUID> productIds = bySku.values().stream().map(v -> v.getProduct().getId()).collect(Collectors.toSet());
        Map<UUID, String> cover = new HashMap<>();
        if (!productIds.isEmpty()) {
            for (ProductImage i : images.findByProductIdInOrderByPositionAsc(productIds)) cover.putIfAbsent(i.getProductId(), i.getUrl());
        }

        // The collection counts every line that can still be bought, so the tier shown matches what checkout will give.
        Map<Variant, Integer> buyable = new LinkedHashMap<>();
        for (CartItem item : items) {
            Variant v = bySku.get(item.sku());
            if (v != null && v.isActive() && v.getProduct().isActive()) buyable.merge(v, item.quantity(), Integer::sum);
        }
        CollectionPricing.Collection collection = collections.evaluate(buyable, customer);

        List<QuoteLine> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        boolean canCheckout = true;
        for (CartItem item : items) {
            Variant v = bySku.get(item.sku());
            if (v == null || !v.isActive() || !v.getProduct().isActive()) {
                lines.add(new QuoteLine(item.sku(), null, v == null ? item.sku() : v.getProduct().getName(), null, null, null, item.quantity(),
                        null, null, null, null, 0, LineProblem.UNAVAILABLE, "This item is no longer in the shop."));
                canCheckout = false;
                continue;
            }
            BigDecimal list = v.getPrice();
            PricingService.PricedLine plain = pricing.price(v, null, customer, item.quantity(), collection.tierDiscountPct());
            BigDecimal pct = plain.discountPct(), unit = plain.unitPrice();
            String note = null;
            try {
                PricingService.PricedLine priced = pricing.price(v, item.negotiationSessionId(), customer, item.quantity(),
                        collection.tierDiscountPct());
                pct = priced.discountPct();
                unit = priced.unitPrice();
            } catch (BusinessRuleException e) {
                note = e.getMessage();                  // the offer cannot be honoured: show the collection price and say why
            }
            int available = Math.max(0, v.available());
            LineProblem problem = available == 0 ? LineProblem.SOLD_OUT : available < item.quantity() ? LineProblem.NOT_ENOUGH_STOCK : LineProblem.NONE;
            if (problem == LineProblem.SOLD_OUT) note = "Sold out.";
            else if (problem == LineProblem.NOT_ENOUGH_STOCK) note = "Only " + available + " left.";
            if (problem != LineProblem.NONE) canCheckout = false;
            BigDecimal lineTotal = unit.multiply(BigDecimal.valueOf(item.quantity()));
            total = total.add(lineTotal);
            lines.add(new QuoteLine(v.getSku(), v.getProduct().getSlug(), v.getProduct().getName(), label(v), v.getColorHex(),
                    cover.get(v.getProduct().getId()), item.quantity(), list, pct, unit, lineTotal, available, problem, note));
        }
        if (collection.belowMinimum()) canCheckout = false;
        CollectionPricing.NextTier next = collection.next();
        CollectionView view = new CollectionView(collection.totalPairs(), collection.minimumPairs(), collection.tierDiscountPct(),
                next == null ? null : new NextTierView(next.minPairs(), next.discountPct(), next.pairsToGo()),
                collection.belowMinimum() ? collection.minimumMessage() : null);
        return new Quote(lines, total, canCheckout, view);
    }

    /** "Navy, M, 3 pairs" */
    static String label(Variant v) {
        List<String> parts = new ArrayList<>();
        if (v.getColor() != null) parts.add(v.getColor());
        if (v.getSize() != null) parts.add(v.getSize());
        if (v.getPackSize() != null && v.getPackSize() > 1) parts.add(v.getPackSize() + " pairs");
        return String.join(", ", parts);
    }
}
