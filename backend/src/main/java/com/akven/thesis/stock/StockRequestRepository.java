package com.akven.thesis.stock;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockRequestRepository extends JpaRepository<StockRequest, UUID> {

    Optional<StockRequest> findByVariantIdAndUserId(UUID variantId, UUID userId);

    List<StockRequest> findByUserIdAndNotifiedAtIsNull(UUID userId);

    List<StockRequest> findByNotifiedAtIsNullOrderByCreatedAtAsc();

    long countByUserIdAndNotifiedAtIsNull(UUID userId);
}
