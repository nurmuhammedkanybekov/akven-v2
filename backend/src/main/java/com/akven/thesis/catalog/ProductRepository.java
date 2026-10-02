package com.akven.thesis.catalog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

    Optional<Product> findBySlug(String slug);

    /** Storefront detail page: retired products are hidden, not deleted. */
    Optional<Product> findBySlugAndActiveTrue(String slug);

    boolean existsBySlug(String slug);

    long countBySectionId(java.util.UUID termId);

    long countByCutId(java.util.UUID termId);

    /** Storefront listing (UC-1) — retired products are excluded, not deleted. */
    List<Product> findByActiveTrue();
}
