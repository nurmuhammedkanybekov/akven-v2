package com.akven.thesis.catalog;

import org.springframework.web.bind.annotation.*;
import java.util.List;

/** Public catalog browsing — Phase 1 work (Milestone 2). Stubbed here so the skeleton runs end to end. */
@RestController
@RequestMapping("/api/products")
public class CatalogController {

    private final ProductRepository productRepository;

    public CatalogController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @GetMapping
    public List<Product> listProducts() {
        return productRepository.findAll();
    }
}
