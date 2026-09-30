package com.akven.thesis.catalog;

/** Whitelisted storefront sort orders; anything unrecognised means NEWEST. */
public enum CatalogSort {
    NEWEST, NAME, PRICE_ASC, PRICE_DESC;

    public static CatalogSort parse(String value) {
        if (value == null) {
            return NEWEST;
        }
        return switch (value.trim().toLowerCase()) {
            case "name" -> NAME;
            case "price_asc", "price-asc" -> PRICE_ASC;
            case "price_desc", "price-desc" -> PRICE_DESC;
            default -> NEWEST;
        };
    }
}
