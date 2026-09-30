package com.akven.thesis.catalog;

import java.math.BigDecimal;

/**
 * Everything a shopper can filter the catalog by. Any field may be null (= no restriction).
 * section and cut are slugs of admin-managed terms ("sport", "mid-long").
 */
public record CatalogFilter(Category category, String section, String cut, String collection, String q,
                            boolean inStock, String size, String color,
                            BigDecimal minPrice, BigDecimal maxPrice) {

    /** Copies used by facet counting: a dimension's own counts ignore that dimension's current choice. */
    CatalogFilter withoutCategory() {
        return new CatalogFilter(null, section, cut, collection, q, inStock, size, color, minPrice, maxPrice);
    }

    CatalogFilter withoutSection() {
        return new CatalogFilter(category, null, cut, collection, q, inStock, size, color, minPrice, maxPrice);
    }

    CatalogFilter withoutCut() {
        return new CatalogFilter(category, section, null, collection, q, inStock, size, color, minPrice, maxPrice);
    }

    /** True when at least one condition has to be checked against a product's variants. */
    boolean hasVariantConditions() {
        return inStock || size != null || color != null || minPrice != null || maxPrice != null;
    }
}
