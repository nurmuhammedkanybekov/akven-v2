package com.akven.thesis.catalog;

import com.akven.thesis.catalog.CatalogViews.FacetOption;
import com.akven.thesis.catalog.CatalogViews.Facets;
import com.akven.thesis.catalog.CatalogViews.ImageView;
import com.akven.thesis.catalog.CatalogViews.ProductDetail;
import com.akven.thesis.catalog.CatalogViews.ProductSummary;
import com.akven.thesis.catalog.CatalogViews.TermInfo;
import com.akven.thesis.catalog.CatalogViews.TermsView;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.common.PageResponse;
import com.akven.thesis.pricing.CollectionPricing;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Read side of the catalog: what an anonymous shopper may see (FR-1, UC-1). */
@Service
@Transactional(readOnly = true)
public class CatalogService {

    static final int DEFAULT_PAGE_SIZE = 12;
    static final int MAX_PAGE_SIZE = 48;

    private final ProductRepository productRepository;
    private final VariantRepository variantRepository;
    private final ProductImageRepository imageRepository;
    private final CatalogTermRepository termRepository;
    private final EntityManager entityManager;
    private final CollectionPricing collections;

    /** Dates such as "arrives in 12 days" are counted in the shop's own time zone. */
    public static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Bishkek");

    public CatalogService(ProductRepository productRepository, VariantRepository variantRepository,
                          ProductImageRepository imageRepository, CatalogTermRepository termRepository,
                          EntityManager entityManager, CollectionPricing collections) {
        this.collections = collections;
        this.termRepository = termRepository;
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
        this.imageRepository = imageRepository;
        this.entityManager = entityManager;
    }

    public PageResponse<ProductSummary> list(CatalogFilter filter, int page, int size, CatalogSort sort) {
        int safeSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
        // Price sorting is part of the specification itself; the other orders are plain column sorts.
        Sort order = switch (sort) {
            case NAME -> Sort.by(Sort.Order.asc("name"), Sort.Order.asc("slug"));
            case NEWEST -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("slug"));
            case PRICE_ASC, PRICE_DESC -> Sort.unsorted();
        };
        Page<Product> products = productRepository.findAll(ProductSpecifications.storefront(filter, sort),
                PageRequest.of(Math.max(page, 0), safeSize, order));

        Map<UUID, ProductSummary> summaries = summaries(products.getContent());
        return PageResponse.of(products, p -> summaries.get(p.getId()));
    }

    /** The socks people buy most, and how many of them really sold: the rest of the list is the newest in stock. */
    public record Bestsellers(List<ProductSummary> items, int sold) {}

    /**
     * Ranked by pairs in paid and completed orders (a pack counts once per pack, like a line on the receipt). When too
     * few have sold, the list is topped up with the newest socks in stock, and {@code sold} says how many are real
     * bestsellers, so the shop never calls a sock a bestseller that is not one.
     */
    @SuppressWarnings("unchecked")
    public Bestsellers bestsellers(Category category, int limit) {
        int n = Math.max(1, Math.min(limit, 24));
        var query = entityManager.createQuery("""
                select v.product.id from OrderItem i join i.variant v join i.order o
                where o.status in (com.akven.thesis.order.OrderStatus.PAID, com.akven.thesis.order.OrderStatus.FULFILLED)
                  and v.product.active = true and (:category is null or v.product.category = :category)
                group by v.product.id order by sum(i.quantity) desc, v.product.id""", UUID.class)
                .setParameter("category", category).setMaxResults(n);
        List<UUID> ranked = query.getResultList();
        Map<UUID, Product> byId = productRepository.findAllById(ranked).stream().collect(Collectors.toMap(Product::getId, p -> p));
        List<Product> chosen = new java.util.ArrayList<>(ranked.stream().map(byId::get).filter(java.util.Objects::nonNull).toList());
        int sold = chosen.size();
        if (chosen.size() < n) {
            CatalogFilter newest = new CatalogFilter(category, null, null, null, null, true, null, null, null, null);
            for (Product p : productRepository.findAll(ProductSpecifications.storefront(newest, CatalogSort.NEWEST),
                    PageRequest.of(0, n * 2, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("slug")))).getContent()) {
                if (chosen.size() >= n) break;
                if (!byId.containsKey(p.getId())) chosen.add(p);
            }
        }
        Map<UUID, ProductSummary> summaries = summaries(chosen);
        return new Bestsellers(chosen.stream().map(p -> summaries.get(p.getId())).toList(), sold);
    }

    /** Card data for a set of products: active options, and the cover and hover pictures. */
    private Map<UUID, ProductSummary> summaries(List<Product> products) {
        List<UUID> ids = products.stream().map(Product::getId).toList();
        Map<UUID, List<Variant>> variantsByProduct = ids.isEmpty() ? new HashMap<>()
                : variantRepository.findByProductIdInAndActiveTrue(ids).stream()
                        .collect(Collectors.groupingBy(v -> v.getProduct().getId()));

        // The first picture of the product as a whole is the card's cover, the second (if any) shows on hover. Pictures
        // of one colour are for the product page; a product with only those uses its first ones.
        Map<UUID, List<ImageView>> imagesByProduct = new HashMap<>();
        if (!ids.isEmpty()) {
            Map<UUID, List<ProductImage>> all = imageRepository.findByProductIdInOrderByPositionAsc(ids).stream()
                    .collect(Collectors.groupingBy(ProductImage::getProductId));
            all.forEach((id, list) -> {
                List<ProductImage> general = list.stream().filter(i -> i.getColor() == null).toList();
                imagesByProduct.put(id, (general.isEmpty() ? list : general).stream().limit(2).map(ImageView::of).toList());
            });
        }
        Map<UUID, ProductSummary> out = new HashMap<>();
        for (Product p : products) {
            List<ImageView> images = imagesByProduct.getOrDefault(p.getId(), List.of());
            out.put(p.getId(), ProductSummary.of(p, variantsByProduct.getOrDefault(p.getId(), List.of()),
                    images.isEmpty() ? null : images.get(0), images.size() < 2 ? null : images.get(1)));
        }
        return out;
    }

    /**
     * Counts per category / section / cut for the current filters. Each dimension ignores its own
     * selection, so picking "Men" still shows how many Women's products there are to switch to.
     * Every active section and cut appears, with 0 where nothing matches, in the admin's order.
     */
    public Facets facets(CatalogFilter filter) {
        Map<Category, Long> categories = new EnumMap<>(Category.class);
        for (Category c : Category.values()) {
            categories.put(c, 0L);
        }
        countBy("category", ProductSpecifications.storefront(filter.withoutCategory()))
                .forEach((value, n) -> categories.put((Category) value, n));
        return new Facets(categories,
                options(TermKind.SECTION, "section", ProductSpecifications.storefront(filter.withoutSection())),
                options(TermKind.CUT, "cut", ProductSpecifications.storefront(filter.withoutCut())));
    }

    public TermsView terms() {
        return new TermsView(
                termRepository.findByKindAndActiveTrueOrderByPositionAscNameAsc(TermKind.SECTION).stream().map(TermInfo::of).toList(),
                termRepository.findByKindAndActiveTrueOrderByPositionAscNameAsc(TermKind.CUT).stream().map(TermInfo::of).toList());
    }

    private List<FacetOption> options(TermKind kind, String attribute, Specification<Product> spec) {
        Map<Object, Long> counts = countBy(attribute + ".id", spec);
        return termRepository.findByKindAndActiveTrueOrderByPositionAscNameAsc(kind).stream()
                .map(t -> new FacetOption(t.getSlug(), t.getName(), counts.getOrDefault(t.getId(), 0L)))
                .toList();
    }

    /** SELECT attribute, count(*) ... GROUP BY attribute, under the storefront specification. */
    private Map<Object, Long> countBy(String attributePath, Specification<Product> spec) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> cq = cb.createTupleQuery();
        Root<Product> root = cq.from(Product.class);
        Path<Object> path = root.get(attributePath.split("\\.")[0]);
        if (attributePath.contains(".")) {
            path = path.get(attributePath.split("\\.")[1]);
        }
        cq.multiselect(path.alias("value"), cb.count(root).alias("n"))
                .where(spec.toPredicate(root, cq, cb))
                .groupBy(path);
        Map<Object, Long> counts = new HashMap<>();
        for (Tuple t : entityManager.createQuery(cq).getResultList()) {
            if (t.get("value") != null) {
                counts.put(t.get("value"), t.get("n", Long.class));
            }
        }
        return counts;
    }

    public ProductDetail detail(String slug) {
        Product product = productRepository.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new NotFoundException("Product not found: " + slug));
        return ProductDetail.of(product,
                variantRepository.findByProductIdAndActiveTrueOrderByPackSizeAscSizeAscColorAsc(product.getId()),
                imageRepository.findByProductIdOrderByPositionAsc(product.getId()),
                collections.policy().getFewLeftThreshold(), LocalDate.now(SHOP_ZONE));
    }
}
