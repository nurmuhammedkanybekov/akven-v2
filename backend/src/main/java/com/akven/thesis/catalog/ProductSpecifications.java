package com.akven.thesis.catalog;

import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Builds the storefront query from a CatalogFilter. All variant-level conditions
 * (in stock, size, color, price range) are placed in ONE exists() subquery, so
 * "size M and in stock" means a single variant that is both — not one M variant
 * plus an unrelated in-stock one.
 */
final class ProductSpecifications {

    private ProductSpecifications() {
    }

    static Specification<Product> storefront(CatalogFilter f) {
        return storefront(f, CatalogSort.NEWEST);
    }

    /**
     * Price sorting orders by each product's cheapest active variant. It lives here because Spring Data's
     * Sort can only name columns of the root entity. The count query (result type Long) must not be ordered.
     */
    static Specification<Product> storefront(CatalogFilter f, CatalogSort sort) {
        return (root, query, cb) -> {
            if ((sort == CatalogSort.PRICE_ASC || sort == CatalogSort.PRICE_DESC) && query.getResultType() != Long.class) {
                Subquery<BigDecimal> cheapest = query.subquery(BigDecimal.class);
                Root<Variant> mv = cheapest.from(Variant.class);
                cheapest.select(cb.min(mv.<BigDecimal>get("price")))
                        .where(cb.equal(mv.get("product"), root), cb.isTrue(mv.get("active")));
                boolean asc = sort == CatalogSort.PRICE_ASC;
                // Products with no sellable variant go last in either direction.
                var key = cb.coalesce(cheapest, asc ? new BigDecimal("999999999") : BigDecimal.ONE.negate());
                query.orderBy(asc ? cb.asc(key) : cb.desc(key), cb.asc(root.get("slug")));
            }
            List<Predicate> all = new ArrayList<>();
            all.add(cb.isTrue(root.get("active")));
            if (f.category() != null) all.add(cb.equal(root.get("category"), f.category()));
            if (f.cut() != null) all.add(cb.equal(root.get("cut"), f.cut()));
            if (f.occasion() != null) all.add(cb.equal(root.get("occasion"), f.occasion()));
            if (f.collection() != null) {
                all.add(cb.equal(cb.lower(root.get("collection")), f.collection().toLowerCase(Locale.ROOT)));
            }
            if (f.q() != null) {
                String like = "%" + escapeLike(f.q().toLowerCase(Locale.ROOT)) + "%";
                all.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like, '\\'),
                        cb.like(cb.lower(root.get("collection")), like, '\\')));
            }
            if (f.hasVariantConditions()) {
                Subquery<Integer> sub = query.subquery(Integer.class);
                Root<Variant> v = sub.from(Variant.class);
                List<Predicate> vp = new ArrayList<>();
                vp.add(cb.equal(v.get("product"), root));
                vp.add(cb.isTrue(v.get("active")));
                if (f.inStock()) vp.add(cb.greaterThan(v.<Integer>get("stockQty"), v.<Integer>get("reservedQty")));
                if (f.size() != null) vp.add(cb.equal(cb.lower(v.get("size")), f.size().toLowerCase(Locale.ROOT)));
                if (f.color() != null) vp.add(cb.equal(cb.lower(v.get("color")), f.color().toLowerCase(Locale.ROOT)));
                if (f.minPrice() != null) vp.add(cb.greaterThanOrEqualTo(v.<BigDecimal>get("price"), f.minPrice()));
                if (f.maxPrice() != null) vp.add(cb.lessThanOrEqualTo(v.<BigDecimal>get("price"), f.maxPrice()));
                sub.select(cb.literal(1)).where(vp.toArray(new Predicate[0]));
                all.add(cb.exists(sub));
            }
            return cb.and(all.toArray(new Predicate[0]));
        };
    }

    /** Stops user-typed % and _ from acting as wildcards. */
    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
