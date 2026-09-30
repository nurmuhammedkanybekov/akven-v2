package com.akven.thesis.catalog;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Customer-facing response shapes. These are explicit records, never entities, so a
 * new column on Product/Variant can never leak by accident. Note what is NOT here:
 * costPrice and marginFloorPct (security requirement; see CatalogControllerTest).
 */
public final class CatalogViews {

    private CatalogViews() {
    }

    public record ImageView(String url, String alt) {
        static ImageView of(ProductImage i) {
            return new ImageView(i.getUrl(), i.getAlt());
        }
    }

    /** How many products match each choice of a filter dimension, given the other active filters. */
    public record Facets(Map<Category, Long> category, Map<Cut, Long> cut, Map<Occasion, Long> occasion) {}

    public record VariantView(String sku, String size, String color, Integer packSize,
                              BigDecimal price, int availableQty) {
        static VariantView of(Variant v) {
            return new VariantView(v.getSku(), v.getSize(), v.getColor(), v.getPackSize(),
                    v.getPrice(), Math.max(0, v.available()));
        }
    }

    /** Card in the catalog grid. minPrice is the cheapest sellable variant ("from 6.50"). */
    public record ProductSummary(String slug, String name, Category category, Cut cut, Occasion occasion,
                                 String collection, BigDecimal minPrice, boolean inStock, int variantCount,
                                 ImageView image) {
        static ProductSummary of(Product p, List<Variant> sellableVariants, ImageView cover) {
            BigDecimal min = sellableVariants.stream().map(Variant::getPrice)
                    .min(BigDecimal::compareTo).orElse(null);
            boolean inStock = sellableVariants.stream().anyMatch(v -> v.available() > 0);
            return new ProductSummary(p.getSlug(), p.getName(), p.getCategory(), p.getCut(), p.getOccasion(),
                    p.getCollection(), min, inStock, sellableVariants.size(), cover);
        }
    }

    public record ProductDetail(String slug, String name, Category category, Cut cut, Occasion occasion,
                                String collection, String description, String fabricComposition,
                                List<ImageView> images, List<VariantView> variants) {
        static ProductDetail of(Product p, List<Variant> sellableVariants, List<ProductImage> images) {
            return new ProductDetail(p.getSlug(), p.getName(), p.getCategory(), p.getCut(), p.getOccasion(),
                    p.getCollection(), p.getDescription(), p.getFabricComposition(),
                    images.stream().map(ImageView::of).toList(),
                    sellableVariants.stream().map(VariantView::of).toList());
        }
    }
}
