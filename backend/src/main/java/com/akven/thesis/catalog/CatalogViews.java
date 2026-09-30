package com.akven.thesis.catalog;

import java.math.BigDecimal;
import java.util.List;

/**
 * Customer-facing response shapes. These are explicit records, never entities, so a
 * new column on Product/Variant can never leak by accident. Note what is NOT here:
 * costPrice and marginFloorPct (security requirement; see CatalogControllerTest).
 */
public final class CatalogViews {

    private CatalogViews() {
    }

    public record VariantView(String sku, String size, String color, Integer packSize,
                              BigDecimal price, int availableQty) {
        static VariantView of(Variant v) {
            return new VariantView(v.getSku(), v.getSize(), v.getColor(), v.getPackSize(),
                    v.getPrice(), Math.max(0, v.available()));
        }
    }

    /** Card in the catalog grid. minPrice is the cheapest sellable variant ("from 6.50"). */
    public record ProductSummary(String slug, String name, Category category, Cut cut, Occasion occasion,
                                 String collection, BigDecimal minPrice, boolean inStock, int variantCount) {
        static ProductSummary of(Product p, List<Variant> sellableVariants) {
            BigDecimal min = sellableVariants.stream().map(Variant::getPrice)
                    .min(BigDecimal::compareTo).orElse(null);
            boolean inStock = sellableVariants.stream().anyMatch(v -> v.available() > 0);
            return new ProductSummary(p.getSlug(), p.getName(), p.getCategory(), p.getCut(), p.getOccasion(),
                    p.getCollection(), min, inStock, sellableVariants.size());
        }
    }

    public record ProductDetail(String slug, String name, Category category, Cut cut, Occasion occasion,
                                String collection, String description, String fabricComposition,
                                List<VariantView> variants) {
        static ProductDetail of(Product p, List<Variant> sellableVariants) {
            return new ProductDetail(p.getSlug(), p.getName(), p.getCategory(), p.getCut(), p.getOccasion(),
                    p.getCollection(), p.getDescription(), p.getFabricComposition(),
                    sellableVariants.stream().map(VariantView::of).toList());
        }
    }
}
