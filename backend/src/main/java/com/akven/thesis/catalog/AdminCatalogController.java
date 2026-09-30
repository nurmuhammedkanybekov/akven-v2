package com.akven.thesis.catalog;

import com.akven.thesis.catalog.AdminCatalogDtos.*;
import com.akven.thesis.common.PageResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Admin catalog management. URL rule in SecurityConfig: /api/admin/** needs STAFF or ADMIN.
 * Finer rules (ADMIN-only variant creation and margin floor, FR-11) are enforced on the
 * service methods, so they hold for any caller. Thin on purpose: no logic lives here.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminCatalogController {

    private final AdminCatalogService service;

    public AdminCatalogController(AdminCatalogService service) {
        this.service = service;
    }

    @GetMapping("/products")
    public PageResponse<AdminProductView> list(@RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int pageSize) {
        return service.list(page, pageSize);
    }

    @GetMapping("/products/{id}")
    public AdminProductView get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping("/products")
    public ResponseEntity<AdminProductView> create(Authentication auth, @Valid @RequestBody CreateProductRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createProduct(auth.getName(), body));
    }

    @PutMapping("/products/{id}")
    public AdminProductView update(Authentication auth, @PathVariable UUID id,
                                   @Valid @RequestBody UpdateProductRequest body) {
        return service.updateProduct(auth.getName(), id, body);
    }

    /** Soft delete: the product is retired, never removed. */
    @DeleteMapping("/products/{id}")
    public ResponseEntity<Void> retire(Authentication auth, @PathVariable UUID id) {
        service.retireProduct(auth.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/products/{id}/audit")
    public List<AuditEntryView> productAudit(@PathVariable UUID id) {
        return service.auditTrail(AdminCatalogService.PRODUCT, id);
    }

    @PostMapping("/products/{productId}/variants")
    public ResponseEntity<AdminVariantView> createVariant(Authentication auth, @PathVariable UUID productId,
                                                          @Valid @RequestBody CreateVariantRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createVariant(auth.getName(), productId, body));
    }

    @PutMapping("/variants/{id}")
    public AdminVariantView updateVariant(Authentication auth, @PathVariable UUID id,
                                          @Valid @RequestBody UpdateVariantRequest body) {
        return service.updateVariant(auth.getName(), id, body);
    }

    @PutMapping("/variants/{id}/pricing-policy")
    public AdminVariantView updatePricingPolicy(Authentication auth, @PathVariable UUID id,
                                                @Valid @RequestBody PricingPolicyRequest body) {
        return service.updatePricingPolicy(auth.getName(), id, body);
    }

    @GetMapping("/variants/{id}/audit")
    public List<AuditEntryView> variantAudit(@PathVariable UUID id) {
        return service.auditTrail(AdminCatalogService.VARIANT, id);
    }
}
