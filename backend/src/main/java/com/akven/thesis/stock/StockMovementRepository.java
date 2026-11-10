package com.akven.thesis.stock;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {

    List<StockMovement> findByVariantIdOrderByCreatedAtDescIdDesc(UUID variantId, Pageable page);

    /** The ledger's total for one variant: what its stock must be. */
    @Query("select coalesce(sum(m.delta), 0) from StockMovement m where m.variant.id = :variantId")
    long sumByVariant(@Param("variantId") UUID variantId);
}
