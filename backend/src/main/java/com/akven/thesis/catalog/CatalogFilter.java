package com.akven.thesis.catalog;

import java.math.BigDecimal;

/** Everything a shopper can filter the catalog by. Any field may be null (= no restriction). */
public record CatalogFilter(Category category, Cut cut, Occasion occasion, String collection, String q,
                            boolean inStock, String size, String color,
                            BigDecimal minPrice, BigDecimal maxPrice) {

    /** Copies used by facet counting: a dimension's own counts ignore that dimension's current choice. */
    CatalogFilter withoutCategory() {
        return new CatalogFilter(null, cut, occasion, collection, q, inStock, size, color, minPrice, maxPrice);
    }

    CatalogFilter withoutCut() {
        return new CatalogFilter(category, null, occasion, collection, q, inStock, size, color, minPrice, maxPrice);
    }

    CatalogFilter withoutOccasion() {
        return new CatalogFilter(category, cut, null, collection, q, inStock, size, color, minPrice, maxPrice);
    }

    /** True when at least one condition has to be checked against a product's variants. */
    boolean hasVariantConditions() {
        return inStock || size != null || color != null || minPrice != null || maxPrice != null;
    }
}
