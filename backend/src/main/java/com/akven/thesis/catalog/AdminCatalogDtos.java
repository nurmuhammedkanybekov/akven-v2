package com.akven.thesis.catalog;

import jakarta.validation.Valid;
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

    static final String HEX = "#[0-9a-fA-F]{6}";

    // ---- products ---------------------------------------------------------------------------

    /**
     * slug is optional: when blank it is made from the name ("Mid-Long Socks" becomes "mid-long-socks", with a number
     * added if taken). sectionId and cutId point at admin-managed terms and must be empty for bundles.
     */
    public record CreateProductRequest(
            @Size(max = 160) @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*",
                    message = "must be lowercase letters, digits and hyphens") String slug,
            @NotBlank @Size(max = 255) String name,
            @NotNull Category category, UUID sectionId, UUID cutId,
            @Size(max = 255) String collection,
            @Size(max = 2000) String description,
            @Size(max = 255) String fabricComposition,
            @Size(max = 120) String quality,
            @Size(max = 500) String care,
            @Size(max = 80) String origin) {}

    /** Slug is deliberately absent: it is a stable public identifier and is never changed. */
    public record UpdateProductRequest(
            @NotBlank @Size(max = 255) String name,
            @NotNull Category category, UUID sectionId, UUID cutId,
            @Size(max = 255) String collection,
            @Size(max = 2000) String description,
            @Size(max = 255) String fabricComposition,
            @Size(max = 120) String quality,
            @Size(max = 500) String care,
            @Size(max = 80) String origin) {}

    // ---- variants (size / colour / pack) ---------------------------------------------------

    /** ADMIN only: creating a variant sets its cost price and margin floor. colorHex is the swatch, as #RRGGBB. */
    public record CreateVariantRequest(
            @NotBlank @Size(max = 64) String sku,
            @Size(max = 32) String size, @Size(max = 64) String color,
            @Pattern(regexp = HEX, message = "must look like #C9A24B") String colorHex,
            @Positive Integer packSize,
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
            @Size(max = 32) String size, @Size(max = 64) String color,
            @Pattern(regexp = HEX, message = "must look like #C9A24B") String colorHex,
            @Positive Integer packSize,
            @NotNull @PositiveOrZero BigDecimal price,
            @NotNull @PositiveOrZero Integer stockQty,
            @NotNull Boolean active,
            Integer version) {}

    /**
     * STAFF and ADMIN: what is on the way and when it arrives, and how many pairs make one wholesale case.
     * An arrival date needs incoming stock, and the date cannot be in the past.
     */
    public record SupplyRequest(
            @Positive @jakarta.validation.constraints.Max(100000) Integer casePairs,
            @NotNull @PositiveOrZero Integer incomingQty,
            java.time.LocalDate restockEta,
            Integer version) {}

    /** ADMIN only: the two values the negotiation guardrail is built on (FR-11). */
    public record PricingPolicyRequest(
            @NotNull @PositiveOrZero BigDecimal costPrice,
            @NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal marginFloorPct,
            Integer version) {}

    // ---- images -----------------------------------------------------------------------------

    /** Only our own media path or https: rules out javascript: and data: URLs. */
    public record ImageRequest(
            @NotBlank @Size(max = 500) @Pattern(regexp = "(https://|/media/)[^\\s\"'<>]+",
                    message = "must start with https:// or /media/ and contain no spaces or quotes") String url,
            @NotBlank @Size(max = 255) String alt) {}

    /** Replaces the whole ordered image list (this is also how photos are reordered or removed); first = cover. */
    public record ReplaceImagesRequest(@NotNull @Size(max = 8) List<@Valid @NotNull ImageRequest> images) {}

    public record AdminImageView(UUID id, String url, String alt, int position) {
        static AdminImageView of(ProductImage i) {
            return new AdminImageView(i.getId(), i.getUrl(), i.getAlt(), i.getPosition());
        }
    }

    // ---- sections and cuts ------------------------------------------------------------------

    /** slug is made from the name. */
    public record CreateTermRequest(
            @NotNull TermKind kind,
            @NotBlank @Size(max = 120) String name,
            @Size(max = 500) String description) {}

    /** active=false hides the section or cut from storefront filters; the products keep it. */
    public record UpdateTermRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 500) String description,
            @NotNull Boolean active) {}

    /** The new order of all terms of one kind, first to last. */
    public record ReorderTermsRequest(
            @NotNull TermKind kind,
            @NotNull @Size(min = 1, max = 100) List<@NotNull UUID> ids) {}

    public record AdminTermRef(UUID id, String slug, String name) {
        static AdminTermRef of(CatalogTerm t) {
            return t == null ? null : new AdminTermRef(t.getId(), t.getSlug(), t.getName());
        }
    }

    public record AdminTermView(UUID id, TermKind kind, String slug, String name, String description,
                                int position, boolean active, long productCount, Integer version) {
        static AdminTermView of(CatalogTerm t, long productCount) {
            return new AdminTermView(t.getId(), t.getKind(), t.getSlug(), t.getName(), t.getDescription(),
                    t.getPosition(), t.isActive(), productCount, t.getVersion());
        }
    }

    // ---- responses --------------------------------------------------------------------------

    public record AdminVariantView(UUID id, String sku, String size, String color, String colorHex, Integer packSize,
                                   BigDecimal price, BigDecimal costPrice, BigDecimal marginFloorPct,
                                   int stockQty, int reservedQty, int availableQty,
                                   boolean active, Integer version, Integer casePairs, int incomingQty,
                                   java.time.LocalDate restockEta) {
        static AdminVariantView of(Variant v) {
            return new AdminVariantView(v.getId(), v.getSku(), v.getSize(), v.getColor(), v.getColorHex(),
                    v.getPackSize(), v.getPrice(), v.getCostPrice(), v.getMarginFloorPct(),
                    v.getStockQty(), v.getReservedQty(), v.available(), v.isActive(), v.getVersion(),
                    v.getCasePairs(), v.getIncomingQty(), v.getRestockEta());
        }
    }

    public record AdminProductView(UUID id, String slug, String name, Category category,
                                   AdminTermRef section, AdminTermRef cut, String collection, String description,
                                   String fabricComposition, String quality, String care, String origin,
                                   boolean active, Instant retiredAt, Integer version,
                                   List<AdminImageView> images, List<AdminVariantView> variants) {
        static AdminProductView of(Product p, List<Variant> variants, List<ProductImage> images) {
            return new AdminProductView(p.getId(), p.getSlug(), p.getName(), p.getCategory(),
                    AdminTermRef.of(p.getSection()), AdminTermRef.of(p.getCut()), p.getCollection(), p.getDescription(),
                    p.getFabricComposition(), p.getQuality(), p.getCare(), p.getOrigin(),
                    p.isActive(), p.getRetiredAt(), p.getVersion(),
                    images.stream().map(AdminImageView::of).toList(),
                    variants.stream().map(AdminVariantView::of).toList());
        }
    }

    public record AuditEntryView(UUID id, UUID actorId, String action, String entityType, UUID entityId,
                                 String beforeState, String afterState, String correlationId, Instant createdAt) {}
}
