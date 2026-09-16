package com.akven.thesis.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VariantRepository extends JpaRepository<Variant, UUID> {

    Optional<Variant> findBySku(String sku);

    /** In-stock, active variants for one product — what the storefront actually shows (UC-1). */
    List<Variant> findByProductIdAndActiveTrueAndStockQtyGreaterThan(UUID productId, Integer minStock);
}
