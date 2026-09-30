package com.akven.thesis.catalog;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VariantRepository extends JpaRepository<Variant, UUID> {

    Optional<Variant> findBySku(String sku);

    boolean existsBySku(String sku);

    /** Plain read for price quotes (no locking). */
    List<Variant> findBySkuIn(Collection<String> skus);

    /**
     * Locks the rows for the rest of the transaction (SELECT ... FOR UPDATE), always in SKU order. Two checkouts that
     * want the last pair line up here instead of both passing the stock check; the fixed order means two checkouts
     * that share several items cannot deadlock each other.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Variant v where v.sku in :skus order by v.sku")
    List<Variant> lockBySkuIn(@Param("skus") Collection<String> skus);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Variant v where v.id in :ids order by v.sku")
    List<Variant> lockByIdIn(@Param("ids") Collection<UUID> ids);

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
