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
        return (root, query, cb) -> {
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
