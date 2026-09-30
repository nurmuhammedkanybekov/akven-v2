package com.akven.thesis.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VariantRepository extends JpaRepository<Variant, UUID> {

    Optional<Variant> findBySku(String sku);

    boolean existsBySku(String sku);

    /** In-stock, active variants for one product — what the storefront actually shows (UC-1). */
    List<Variant> findByProductIdAndActiveTrueAndStockQtyGreaterThan(UUID productId, Integer minStock);

    /** All sellable (active) variants of one product, including out-of-stock ones, ordered for display. */
    List<Variant> findByProductIdAndActiveTrueOrderByPackSizeAscSizeAscColorAsc(UUID productId);

    /** Batch load for a page of products, so listing a page costs one extra query, not one per product. */
    List<Variant> findByProductIdInAndActiveTrue(Collection<UUID> productIds);

    /** Batch load for the admin list (active or not). */
    List<Variant> findByProductIdInOrderBySkuAsc(Collection<UUID> productIds);

    /** Admin view: every variant of one product, active or not. */
    List<Variant> findByProductIdOrderBySkuAsc(UUID productId);
}
