package com.akven.thesis.catalog;

import com.akven.thesis.audit.AuditLogEntry;
import com.akven.thesis.audit.AuditLogRepository;
import com.akven.thesis.audit.AuditService;
import com.akven.thesis.catalog.AdminCatalogDtos.*;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.ConflictException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.common.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Locale;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import com.akven.thesis.common.Slugs;
import com.akven.thesis.media.MediaStorage;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Write side of the catalog. Role rules live here on the service methods (not only on URLs)
 * so they hold no matter which controller or future caller reaches this code:
 * <ul>
 *   <li>STAFF and ADMIN: edit product text, taxonomy, retire products, edit variant price/stock/listing.</li>
 *   <li>ADMIN only: create variants and change costPrice / marginFloorPct (FR-11), read the audit trail.</li>
 * </ul>
 * Every mutation writes an audit entry in the same transaction (FR-13). Products are never
 * hard-deleted (FR-10): retiring hides them from the storefront and keeps historical orders intact.
 */
@Service
@Transactional
public class AdminCatalogService {

    static final String PRODUCT = "PRODUCT";
    static final String VARIANT = "VARIANT";

    private final ProductRepository productRepository;
    private final VariantRepository variantRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;
    private final ProductImageRepository imageRepository;
    private final CatalogTermRepository termRepository;
    private final MediaStorage mediaStorage;

    private static final int MAX_IMAGES = 8;

    /** Routes that would be shadowed by fixed paths under /api/products. */
    private static final java.util.Set<String> RESERVED_SLUGS = java.util.Set.of("facets");

    public AdminCatalogService(ProductRepository productRepository, VariantRepository variantRepository,
                               AuditLogRepository auditLogRepository, AuditService auditService,
                               ProductImageRepository imageRepository, CatalogTermRepository termRepository,
                               MediaStorage mediaStorage) {
        this.imageRepository = imageRepository;
        this.termRepository = termRepository;
        this.mediaStorage = mediaStorage;
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditService = auditService;
    }

    // ---- reads -----------------------------------------------------------------------------

    /** status: "active" (default: visible in the shop), "retired" (hidden) or "all". q searches the name. */
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public PageResponse<AdminProductView> list(String q, String status, int page, int size) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> all = new ArrayList<>();
            if ("retired".equalsIgnoreCase(status)) all.add(cb.isFalse(root.get("active")));
            else if (!"all".equalsIgnoreCase(status)) all.add(cb.isTrue(root.get("active")));
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                all.add(cb.like(cb.lower(root.get("name")), like, '\\'));
            }
            return cb.and(all.toArray(new Predicate[0]));
        };
        Page<Product> products = productRepository.findAll(spec, PageRequest.of(Math.max(page, 0),
                size <= 0 ? 20 : Math.min(size, 100), Sort.by("name").and(Sort.by("slug"))));
        List<UUID> ids = products.getContent().stream().map(Product::getId).toList();
        Map<UUID, List<Variant>> variants = ids.isEmpty() ? new HashMap<>()
                : variantRepository.findByProductIdInOrderBySkuAsc(ids).stream()
                        .collect(Collectors.groupingBy(v -> v.getProduct().getId()));
        Map<UUID, List<ProductImage>> images = ids.isEmpty() ? new HashMap<>()
                : imageRepository.findByProductIdInOrderByPositionAsc(ids).stream()
                        .collect(Collectors.groupingBy(ProductImage::getProductId));
        return PageResponse.of(products, p -> AdminProductView.of(p,
                variants.getOrDefault(p.getId(), List.of()), images.getOrDefault(p.getId(), List.of())));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public AdminProductView get(UUID productId) {
        Product product = requireProduct(productId);
        return view(product);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<AuditEntryView> auditTrail(String entityType, UUID entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId).stream()
                .map(AdminCatalogService::toView).toList();
    }

    // ---- products --------------------------------------------------------------------------

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public AdminProductView createProduct(String actor, CreateProductRequest r) {
        CatalogTerm section = resolveTerm(r.sectionId(), TermKind.SECTION, null);
        CatalogTerm cut = resolveTerm(r.cutId(), TermKind.CUT, null);
        requireTermsMatchCategory(r.category(), section, cut);
        String slug = r.slug() != null && !r.slug().isBlank() ? r.slug()
                : Slugs.unique(r.name(), s -> RESERVED_SLUGS.contains(s) || productRepository.existsBySlug(s));
        if (RESERVED_SLUGS.contains(slug)) {
            throw new BusinessRuleException("The slug '" + slug + "' is reserved.");
        }
        if (productRepository.existsBySlug(slug)) {
            throw new ConflictException("A product with slug '" + slug + "' already exists.");
        }
        Product product = new Product(slug, r.name().trim(), r.category(), section, cut,
                blankToNull(r.collection()), blankToNull(r.description()), blankToNull(r.fabricComposition()));
        product.setDetails(blankToNull(r.quality()), blankToNull(r.care()), blankToNull(r.origin()));
        Product saved = productRepository.save(product);
        auditService.record(actor, "PRODUCT_CREATED", PRODUCT, saved.getId(), null, snapshot(saved));
        return view(saved);
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public AdminProductView updateProduct(String actor, UUID productId, UpdateProductRequest r) {
        Product product = requireProduct(productId);
        CatalogTerm section = resolveTerm(r.sectionId(), TermKind.SECTION, product.getSection());
        CatalogTerm cut = resolveTerm(r.cutId(), TermKind.CUT, product.getCut());
        requireTermsMatchCategory(r.category(), section, cut);
        Map<String, Object> before = snapshot(product);
        product.update(r.name().trim(), r.category(), section, cut, blankToNull(r.collection()),
                blankToNull(r.description()), blankToNull(r.fabricComposition()),
                blankToNull(r.quality()), blankToNull(r.care()), blankToNull(r.origin()));
        productRepository.saveAndFlush(product);
        auditService.record(actor, "PRODUCT_UPDATED", PRODUCT, productId, before, snapshot(product));
        return view(product);
    }

    /** Soft delete (FR-10). Retiring an already retired product is a no-op, so the call is idempotent. */
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public void retireProduct(String actor, UUID productId) {
        Product product = requireProduct(productId);
        if (!product.isActive()) {
            return;
        }
        Map<String, Object> before = snapshot(product);
        product.retire();
        productRepository.saveAndFlush(product);
        auditService.record(actor, "PRODUCT_RETIRED", PRODUCT, productId, before, snapshot(product));
    }

    /** Undo of retire: the product shows in the storefront again. Idempotent, like retire. */
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public AdminProductView restoreProduct(String actor, UUID productId) {
        Product product = requireProduct(productId);
        if (!product.isActive()) {
            Map<String, Object> before = snapshot(product);
            product.restore();
            productRepository.saveAndFlush(product);
            auditService.record(actor, "PRODUCT_RESTORED", PRODUCT, productId, before, snapshot(product));
        }
        return view(product);
    }

    /** STAFF and ADMIN. Replaces the ordered picture list (first = cover); audited with before and after. */
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public AdminProductView replaceImages(String actor, UUID productId, ReplaceImagesRequest r) {
        Product product = requireProduct(productId);
        List<Map<String, String>> before = imageSnapshot(imageRepository.findByProductIdOrderByPositionAsc(productId));
        List<String> removedUrls = imageRepository.findByProductIdOrderByPositionAsc(productId).stream()
                .map(ProductImage::getUrl).filter(u -> r.images().stream().noneMatch(n -> n.url().equals(u))).toList();
        imageRepository.deleteAllForProduct(productId);
        List<ProductImage> saved = imageRepository.saveAll(IntStream.range(0, r.images().size())
                .mapToObj(i -> new ProductImage(productId, r.images().get(i).url(), r.images().get(i).alt().trim(), i))
                .toList());
        auditService.record(actor, "PRODUCT_IMAGES_REPLACED", PRODUCT, productId, before, imageSnapshot(saved));
        afterCommit(() -> removedUrls.forEach(mediaStorage::deleteQuietly));
        return view(product);
    }

    /** Adds one uploaded photo at the end of the gallery. The file is validated by its content, see MediaStorage. */
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public AdminProductView uploadImage(String actor, UUID productId, MultipartFile file, String alt) {
        Product product = requireProduct(productId);
        List<ProductImage> existing = imageRepository.findByProductIdOrderByPositionAsc(productId);
        if (existing.size() >= MAX_IMAGES) {
            throw new BusinessRuleException("A product can have at most " + MAX_IMAGES + " photos.");
        }
        String url = mediaStorage.store(file);
        String altText = alt != null && !alt.isBlank() ? alt.trim() : product.getName();
        ProductImage saved = imageRepository.save(new ProductImage(productId, url, altText, existing.size()));
        auditService.record(actor, "PRODUCT_IMAGE_ADDED", PRODUCT, productId, null,
                Map.of("url", saved.getUrl(), "alt", saved.getAlt(), "position", saved.getPosition()));
        return view(product);
    }

    // ---- variants --------------------------------------------------------------------------

    @PreAuthorize("hasRole('ADMIN')")
    public AdminVariantView createVariant(String actor, UUID productId, CreateVariantRequest r) {
        Product product = requireProduct(productId);
        if (!product.isActive()) {
            throw new BusinessRuleException("Cannot add variants to a retired product.");
        }
        if (variantRepository.existsBySku(r.sku())) {
            throw new ConflictException("A variant with SKU '" + r.sku() + "' already exists.");
        }
        requirePriceCoversCost(r.price(), r.costPrice());
        Variant variant = new Variant(product, r.sku(), blankToNull(r.size()), blankToNull(r.color()), r.packSize(),
                r.price(), r.costPrice(), r.marginFloorPct());
        variant.setColorHex(normalizeHex(r.colorHex()));
        variant.setStockQty(r.stockQty());
        Variant saved = variantRepository.saveAndFlush(variant);
        auditService.record(actor, "VARIANT_CREATED", VARIANT, saved.getId(), null, snapshot(saved));
        return AdminVariantView.of(saved);
    }

    /** Price, stock and listing fields. Cannot touch cost or margin floor, even for ADMIN: that is a different call. */
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public AdminVariantView updateVariant(String actor, UUID variantId, UpdateVariantRequest r) {
        Variant variant = requireVariant(variantId);
        requireCurrentVersion(variant, r.version());
        if (r.stockQty() < variant.getReservedQty()) {
            throw new BusinessRuleException("Stock cannot be set below the quantity already reserved ("
                    + variant.getReservedQty() + ").");
        }
        requirePriceCoversCost(r.price(), variant.getCostPrice());
        Map<String, Object> before = snapshot(variant);
        variant.updateListing(blankToNull(r.size()), blankToNull(r.color()), normalizeHex(r.colorHex()), r.packSize(),
                r.price(), r.stockQty(), r.active());
        variantRepository.saveAndFlush(variant);
        auditService.record(actor, "VARIANT_UPDATED", VARIANT, variantId, before, snapshot(variant));
        return AdminVariantView.of(variant);
    }

    /** Supply: incoming stock, its arrival date, and the case size. STAFF may do this; it changes no price. */
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public AdminVariantView updateSupply(String actor, UUID variantId, SupplyRequest r) {
        Variant variant = requireVariant(variantId);
        requireCurrentVersion(variant, r.version());
        if (r.restockEta() != null && r.restockEta().isBefore(java.time.LocalDate.now(CatalogService.SHOP_ZONE))) {
            throw new BusinessRuleException("The arrival date cannot be in the past.");
        }
        if (r.restockEta() != null && r.incomingQty() == 0) {
            throw new BusinessRuleException("Enter how many are on the way, or leave the arrival date empty.");
        }
        Map<String, Object> before = snapshot(variant);
        variant.updateSupply(r.casePairs(), r.incomingQty(), r.restockEta());
        variantRepository.saveAndFlush(variant);
        auditService.record(actor, "VARIANT_SUPPLY_UPDATED", VARIANT, variantId, before, snapshot(variant));
        return AdminVariantView.of(variant);
    }

    /** FR-11: the only way to change costPrice or marginFloorPct, and ADMIN only. */
    @PreAuthorize("hasRole('ADMIN')")
    public AdminVariantView updatePricingPolicy(String actor, UUID variantId, PricingPolicyRequest r) {
        Variant variant = requireVariant(variantId);
        requireCurrentVersion(variant, r.version());
        requirePriceCoversCost(variant.getPrice(), r.costPrice());
        Map<String, Object> before = snapshot(variant);
        variant.updatePricingPolicy(r.costPrice(), r.marginFloorPct());
        variantRepository.saveAndFlush(variant);
        auditService.record(actor, "VARIANT_PRICING_POLICY_UPDATED", VARIANT, variantId, before, snapshot(variant));
        return AdminVariantView.of(variant);
    }

    // ---- helpers ---------------------------------------------------------------------------

    private AdminProductView view(Product product) {
        return AdminProductView.of(product, variantRepository.findByProductIdOrderBySkuAsc(product.getId()),
                imageRepository.findByProductIdOrderByPositionAsc(product.getId()));
    }

    private static List<Map<String, String>> imageSnapshot(List<ProductImage> images) {
        return images.stream().map(i -> Map.of("url", i.getUrl(), "alt", i.getAlt())).toList();
    }

    private Product requireProduct(UUID id) {
        return productRepository.findById(id).orElseThrow(() -> new NotFoundException("Product not found: " + id));
    }

    private Variant requireVariant(UUID id) {
        return variantRepository.findById(id).orElseThrow(() -> new NotFoundException("Variant not found: " + id));
    }

    /**
     * Looks up an admin-managed term of the right kind. A hidden (inactive) term cannot be newly assigned,
     * but a product that already has it may keep it while being edited.
     */
    private CatalogTerm resolveTerm(UUID id, TermKind kind, CatalogTerm current) {
        if (id == null) {
            return null;
        }
        CatalogTerm term = termRepository.findByIdAndKind(id, kind)
                .orElseThrow(() -> new BusinessRuleException("Unknown " + kind.name().toLowerCase() + "."));
        if (!term.isActive() && !term.equals(current)) {
            throw new BusinessRuleException("'" + term.getName() + "' is hidden. Show it again before using it.");
        }
        return term;
    }

    private static void requireTermsMatchCategory(Category category, CatalogTerm section, CatalogTerm cut) {
        if (category == Category.BUNDLES && (section != null || cut != null)) {
            throw new BusinessRuleException("Bundles cannot have a section or a cut.");
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String normalizeHex(String hex) {
        return hex == null || hex.isBlank() ? null : hex.trim().toUpperCase();
    }

    /** Runs after the surrounding transaction commits (or immediately when there is none). */
    private static void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { action.run(); }
            });
        } else {
            action.run();
        }
    }

    private static void requirePriceCoversCost(BigDecimal price, BigDecimal costPrice) {
        if (price.compareTo(costPrice) < 0) {
            throw new BusinessRuleException("Price cannot be lower than the cost price.");
        }
    }

    private static void requireCurrentVersion(Variant variant, Integer expected) {
        if (expected != null && !expected.equals(variant.getVersion())) {
            throw new ConflictException("This variant was changed by someone else. Reload it and try again.");
        }
    }

    private static Map<String, Object> snapshot(Product p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("slug", p.getSlug());
        m.put("name", p.getName());
        m.put("category", p.getCategory());
        m.put("section", p.getSection() == null ? null : p.getSection().getSlug());
        m.put("cut", p.getCut() == null ? null : p.getCut().getSlug());
        m.put("collection", p.getCollection());
        m.put("description", p.getDescription());
        m.put("fabricComposition", p.getFabricComposition());
        m.put("quality", p.getQuality());
        m.put("care", p.getCare());
        m.put("origin", p.getOrigin());
        m.put("active", p.isActive());
        return m;
    }

    private static Map<String, Object> snapshot(Variant v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sku", v.getSku());
        m.put("size", v.getSize());
        m.put("color", v.getColor());
        m.put("colorHex", v.getColorHex());
        m.put("packSize", v.getPackSize());
        m.put("price", v.getPrice());
        m.put("costPrice", v.getCostPrice());
        m.put("marginFloorPct", v.getMarginFloorPct());
        m.put("stockQty", v.getStockQty());
        m.put("casePairs", v.getCasePairs());
        m.put("incomingQty", v.getIncomingQty());
        m.put("restockEta", v.getRestockEta() == null ? null : v.getRestockEta().toString());
        m.put("active", v.isActive());
        return m;
    }

    private static AuditEntryView toView(AuditLogEntry e) {
        return new AuditEntryView(e.getId(), e.getActorId(), e.getAction(), e.getEntityType(), e.getEntityId(),
                e.getBeforeState(), e.getAfterState(), e.getCorrelationId(), e.getCreatedAt());
    }
}
