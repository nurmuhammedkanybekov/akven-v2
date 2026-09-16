package com.akven.thesis.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    Optional<Product> findBySlug(String slug);

    /** Storefront listing (UC-1) — retired products are excluded, not deleted. */
    List<Product> findByActiveTrue();
}
