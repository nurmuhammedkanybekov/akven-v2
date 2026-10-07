package com.akven.thesis.catalog;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
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

    /** A section or cut as the shopper sees it. */
    public record TermView(String slug, String name) {
        static TermView of(CatalogTerm t) {
            return t == null ? null : new TermView(t.getSlug(), t.getName());
        }
    }

    /** Section or cut with its description, for navigation and filter menus. */
    public record TermInfo(String slug, String name, String description) {
        static TermInfo of(CatalogTerm t) {
            return new TermInfo(t.getSlug(), t.getName(), t.getDescription());
        }
    }

    public record TermsView(List<TermInfo> sections, List<TermInfo> cuts) {}

    /** One filter choice and how many products it would show, given the other active filters. */
    public record FacetOption(String slug, String name, long count) {}

    public record Facets(Map<Category, Long> category, List<FacetOption> section, List<FacetOption> cut) {}

    /** restockInDays is set only while COMING_SOON: "arrives in about N days". */
    public record VariantView(String sku, String size, String color, String colorHex, Integer packSize, Integer casePairs,
                              BigDecimal price, int availableQty, StockStatus stockStatus, LocalDate restockEta, Integer restockInDays) {
        static VariantView of(Variant v, int fewLeftThreshold, LocalDate today) {
            StockStatus status = v.stockStatus(fewLeftThreshold, today);
            boolean coming = status == StockStatus.COMING_SOON;
            return new VariantView(v.getSku(), v.getSize(), v.getColor(), v.getColorHex(), v.getPackSize(), v.getCasePairs(),
                    v.getPrice(), Math.max(0, v.available()), status, coming ? v.getRestockEta() : null,
                    coming ? (int) ChronoUnit.DAYS.between(today, v.getRestockEta()) : null);
        }
    }

    /** Card in the catalog grid. minPrice is the cheapest sellable variant ("from 6.50"). */
    public record ProductSummary(String slug, String name, Category category, TermView section, TermView cut,
                                 String collection, BigDecimal minPrice, boolean inStock, int variantCount,
                                 ImageView image, List<String> colors) {
        static ProductSummary of(Product p, List<Variant> sellableVariants, ImageView cover) {
            BigDecimal min = sellableVariants.stream().map(Variant::getPrice)
                    .min(BigDecimal::compareTo).orElse(null);
            boolean inStock = sellableVariants.stream().anyMatch(v -> v.available() > 0);
            // Distinct swatches for the card's colour dots, in variant order.
            List<String> colors = sellableVariants.stream().map(Variant::getColorHex)
                    .filter(java.util.Objects::nonNull).distinct().limit(6).toList();
            return new ProductSummary(p.getSlug(), p.getName(), p.getCategory(), TermView.of(p.getSection()),
                    TermView.of(p.getCut()), p.getCollection(), min, inStock, sellableVariants.size(), cover, colors);
        }
    }

    public record ProductDetail(String slug, String name, Category category, TermView section, TermView cut,
                                String collection, String description, String fabricComposition,
                                String quality, String care, String origin,
                                List<ImageView> images, List<VariantView> variants) {
        static ProductDetail of(Product p, List<Variant> sellableVariants, List<ProductImage> images, int fewLeftThreshold, LocalDate today) {
            return new ProductDetail(p.getSlug(), p.getName(), p.getCategory(), TermView.of(p.getSection()),
                    TermView.of(p.getCut()), p.getCollection(), p.getDescription(), p.getFabricComposition(),
                    p.getQuality(), p.getCare(), p.getOrigin(),
                    images.stream().map(ImageView::of).toList(),
                    sellableVariants.stream().map(v -> VariantView.of(v, fewLeftThreshold, today)).toList());
        }
    }
}
