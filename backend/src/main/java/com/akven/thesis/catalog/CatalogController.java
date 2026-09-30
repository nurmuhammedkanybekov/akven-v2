package com.akven.thesis.catalog;

import com.akven.thesis.catalog.CatalogViews.ProductDetail;
import com.akven.thesis.catalog.CatalogViews.ProductSummary;
import com.akven.thesis.common.PageResponse;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

/**
 * Public catalog browsing (FR-1). Anonymous access is allowed by SecurityConfig for GET.
 * Responses are the explicit views in CatalogViews, which never contain cost or margin data.
 */
@RestController
@RequestMapping("/api/products")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public PageResponse<ProductSummary> list(
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) Cut cut,
            @RequestParam(required = false) Occasion occasion,
            @RequestParam(required = false) String collection,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean inStock,
            @RequestParam(required = false) String size,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int pageSize,
            @RequestParam(defaultValue = "newest") String sort) {
        CatalogFilter filter = new CatalogFilter(category, cut, occasion, blankToNull(collection), blankToNull(q),
                inStock, blankToNull(size), blankToNull(color), minPrice, maxPrice);
        return catalogService.list(filter, page, pageSize, sort);
    }

    @GetMapping("/{slug}")
    public ProductDetail detail(@PathVariable String slug) {
        return catalogService.detail(slug);
    }

    private static String blankToNull(String s) {
        return StringUtils.hasText(s) ? s.trim() : null;
    }
}
