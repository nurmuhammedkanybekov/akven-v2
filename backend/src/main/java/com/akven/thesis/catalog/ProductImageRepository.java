package com.akven.thesis.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ProductImageRepository extends JpaRepository<ProductImage, UUID> {

    List<ProductImage> findByProductIdOrderByPositionAsc(UUID productId);

    List<ProductImage> findByProductIdInOrderByPositionAsc(Collection<UUID> productIds);

    /** Executed immediately (bulk delete), so replacing a product's images can re-insert the same positions. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from ProductImage i where i.productId = :productId")
    void deleteAllForProduct(@Param("productId") UUID productId);
}
