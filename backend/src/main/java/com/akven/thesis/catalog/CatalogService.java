package com.akven.thesis.catalog;

import com.akven.thesis.catalog.CatalogViews.Facets;
import com.akven.thesis.catalog.CatalogViews.ImageView;
import com.akven.thesis.catalog.CatalogViews.ProductDetail;
import com.akven.thesis.catalog.CatalogViews.ProductSummary;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.common.PageResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final EntityManager entityManager;

    public CatalogService(ProductRepository productRepository, VariantRepository variantRepository,
                          ProductImageRepository imageRepository, EntityManager entityManager) {
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

        List<UUID> ids = products.getContent().stream().map(Product::getId).toList();
        Map<UUID, List<Variant>> variantsByProduct = ids.isEmpty() ? new HashMap<>()
                : variantRepository.findByProductIdInAndActiveTrue(ids).stream()
                        .collect(Collectors.groupingBy(v -> v.getProduct().getId()));

        Map<UUID, ImageView> covers = new HashMap<>();
        if (!ids.isEmpty()) {
            imageRepository.findByProductIdInOrderByPositionAsc(ids)
                    .forEach(i -> covers.putIfAbsent(i.getProductId(), ImageView.of(i)));
        }

        return PageResponse.of(products,
                p -> ProductSummary.of(p, variantsByProduct.getOrDefault(p.getId(), List.of()), covers.get(p.getId())));
    }

    /**
     * Counts per category / cut / occasion for the current filters. Each dimension ignores its own
     * selection, so picking "Men" still shows how many Women's products there are to switch to.
     * Every value appears, with 0 where nothing matches, so the UI never has to guess.
     */
    public Facets facets(CatalogFilter filter) {
        return new Facets(
                count("category", ProductSpecifications.storefront(filter.withoutCategory()), Category.class),
                count("cut", ProductSpecifications.storefront(filter.withoutCut()), Cut.class),
                count("occasion", ProductSpecifications.storefront(filter.withoutOccasion()), Occasion.class));
    }

    private <E extends Enum<E>> Map<E, Long> count(String attribute,
            org.springframework.data.jpa.domain.Specification<Product> spec, Class<E> type) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> cq = cb.createTupleQuery();
        Root<Product> root = cq.from(Product.class);
        cq.multiselect(root.get(attribute).alias("value"), cb.count(root).alias("n"))
                .where(spec.toPredicate(root, cq, cb))
                .groupBy(root.get(attribute));
        Map<E, Long> counts = new EnumMap<>(type);
        for (E e : type.getEnumConstants()) {
            counts.put(e, 0L);
        }
        for (Tuple t : entityManager.createQuery(cq).getResultList()) {
            E value = t.get("value", type);
            if (value != null) {
                counts.put(value, t.get("n", Long.class));
            }
        }
        return counts;
    }

    public ProductDetail detail(String slug) {
        Product product = productRepository.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new NotFoundException("Product not found: " + slug));
        return ProductDetail.of(product,
                variantRepository.findByProductIdAndActiveTrueOrderByPackSizeAscSizeAscColorAsc(product.getId()),
                imageRepository.findByProductIdOrderByPositionAsc(product.getId()));
    }
}
