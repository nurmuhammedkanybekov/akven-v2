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
import java.util.Collection;
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

    /**
     * The picture for each option, by SKU: the first picture of its own colour, else the first picture of the product
     * as a whole, else its first picture. So a beige pair is shown beige in the bag and on the receipt.
     */
    static Map<String, String> pictures(Collection<Variant> options, ProductImageRepository images) {
        Set<UUID> productIds = options.stream().map(v -> v.getProduct().getId()).collect(Collectors.toSet());
        if (productIds.isEmpty()) return Map.of();
        Map<UUID, List<ProductImage>> byProduct = images.findByProductIdInOrderByPositionAsc(productIds).stream()
                .collect(Collectors.groupingBy(ProductImage::getProductId));
        Map<String, String> out = new HashMap<>();
        for (Variant v : options) {
            List<ProductImage> list = byProduct.getOrDefault(v.getProduct().getId(), List.of());
            list.stream().filter(i -> i.getColor() != null && i.getColor().equalsIgnoreCase(v.getColor())).findFirst()
                    .or(() -> list.stream().filter(i -> i.getColor() == null).findFirst())
                    .or(() -> list.stream().findFirst())
                    .ifPresent(i -> out.put(v.getSku(), i.getUrl()));
        }
        return out;
    }

    /** customer is null for a visitor who is not signed in: listed prices only, no negotiated offers. */
    public Quote quote(List<CartItem> items, User customer) {
        Map<String, Variant> bySku = variants.findBySkuIn(items.stream().map(CartItem::sku).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(Variant::getSku, v -> v));
        Map<String, String> pictures = pictures(bySku.values(), images);

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
                    pictures.get(v.getSku()), item.quantity(), list, pct, unit, lineTotal, available, problem, note));
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
