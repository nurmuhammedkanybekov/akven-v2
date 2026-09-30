package com.akven.thesis.catalog;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Request and response shapes of the admin catalog API. Responses here DO carry cost and margin data. */
public final class AdminCatalogDtos {

    private AdminCatalogDtos() {
    }

    public record CreateProductRequest(
            @NotBlank @Size(max = 160) @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*",
                    message = "must be lowercase letters, digits and hyphens") String slug,
            @NotBlank @Size(max = 255) String name,
            @NotNull Category category, Cut cut, Occasion occasion,
            @Size(max = 255) String collection,
            @Size(max = 2000) String description,
            @Size(max = 255) String fabricComposition) {}

    /** Slug is deliberately absent: it is a stable public identifier and is never changed. */
    public record UpdateProductRequest(
            @NotBlank @Size(max = 255) String name,
            @NotNull Category category, Cut cut, Occasion occasion,
            @Size(max = 255) String collection,
            @Size(max = 2000) String description,
            @Size(max = 255) String fabricComposition) {}

    /** ADMIN only: creating a variant sets its cost price and margin floor. */
    public record CreateVariantRequest(
            @NotBlank @Size(max = 64) String sku,
            @Size(max = 32) String size, @Size(max = 64) String color, @Positive Integer packSize,
            @NotNull @PositiveOrZero BigDecimal price,
            @NotNull @PositiveOrZero BigDecimal costPrice,
            @NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal marginFloorPct,
            @NotNull @PositiveOrZero Integer stockQty) {}

    /**
     * STAFF and ADMIN: everything about a listing except cost and margin floor.
     * version is optional; when sent it must match the current row, so an edit made on
     * a stale screen is rejected with 409 instead of silently overwriting someone else's change.
     */
    public record UpdateVariantRequest(
            @Size(max = 32) String size, @Size(max = 64) String color, @Positive Integer packSize,
            @NotNull @PositiveOrZero BigDecimal price,
            @NotNull @PositiveOrZero Integer stockQty,
            @NotNull Boolean active,
            Integer version) {}

    /** ADMIN only: the two values the negotiation guardrail is built on (FR-11). */
    public record PricingPolicyRequest(
            @NotNull @PositiveOrZero BigDecimal costPrice,
            @NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal marginFloorPct,
            Integer version) {}

    public record AdminVariantView(UUID id, String sku, String size, String color, Integer packSize,
                                   BigDecimal price, BigDecimal costPrice, BigDecimal marginFloorPct,
                                   int stockQty, int reservedQty, int availableQty,
                                   boolean active, Integer version) {
        static AdminVariantView of(Variant v) {
            return new AdminVariantView(v.getId(), v.getSku(), v.getSize(), v.getColor(), v.getPackSize(),
                    v.getPrice(), v.getCostPrice(), v.getMarginFloorPct(),
                    v.getStockQty(), v.getReservedQty(), v.available(), v.isActive(), v.getVersion());
        }
    }

    public record AdminProductView(UUID id, String slug, String name, Category category, Cut cut,
                                   Occasion occasion, String collection, String description,
                                   String fabricComposition, boolean active, Instant retiredAt,
                                   Integer version, List<AdminVariantView> variants) {
        static AdminProductView of(Product p, List<Variant> variants) {
            return new AdminProductView(p.getId(), p.getSlug(), p.getName(), p.getCategory(), p.getCut(),
                    p.getOccasion(), p.getCollection(), p.getDescription(), p.getFabricComposition(),
                    p.isActive(), p.getRetiredAt(), p.getVersion(),
                    variants.stream().map(AdminVariantView::of).toList());
        }
    }

    public record AuditEntryView(UUID id, UUID actorId, String action, String entityType, UUID entityId,
                                 String beforeState, String afterState, String correlationId, Instant createdAt) {}
}
