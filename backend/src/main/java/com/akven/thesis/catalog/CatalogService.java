package com.akven.thesis.catalog;

import com.akven.thesis.catalog.CatalogViews.ProductDetail;
import com.akven.thesis.catalog.CatalogViews.ProductSummary;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.common.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public CatalogService(ProductRepository productRepository, VariantRepository variantRepository) {
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
    }

    /** sort is a whitelist ("newest" or "name"); anything else falls back to newest. */
    public PageResponse<ProductSummary> list(CatalogFilter filter, int page, int size, String sort) {
        int safeSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
        Sort order = "name".equalsIgnoreCase(sort)
                ? Sort.by(Sort.Order.asc("name"), Sort.Order.asc("slug"))
                : Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("slug"));
        Page<Product> products = productRepository.findAll(ProductSpecifications.storefront(filter),
                PageRequest.of(Math.max(page, 0), safeSize, order));

        List<UUID> ids = products.getContent().stream().map(Product::getId).toList();
        Map<UUID, List<Variant>> variantsByProduct = ids.isEmpty() ? new HashMap<>()
                : variantRepository.findByProductIdInAndActiveTrue(ids).stream()
                        .collect(Collectors.groupingBy(v -> v.getProduct().getId()));

        return PageResponse.of(products,
                p -> ProductSummary.of(p, variantsByProduct.getOrDefault(p.getId(), List.of())));
    }

    public ProductDetail detail(String slug) {
        Product product = productRepository.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new NotFoundException("Product not found: " + slug));
        return ProductDetail.of(product,
                variantRepository.findByProductIdAndActiveTrueOrderByPackSizeAscSizeAscColorAsc(product.getId()));
    }
}
