package com.akven.thesis.catalog;

import com.akven.thesis.catalog.CatalogViews.Facets;
import com.akven.thesis.catalog.CatalogViews.ProductDetail;
import com.akven.thesis.catalog.CatalogViews.ProductSummary;
import com.akven.thesis.catalog.CatalogViews.TermsView;
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
@RequestMapping("/api")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/products")
    public PageResponse<ProductSummary> list(
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) String section,
            @RequestParam(required = false) String cut,
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
        return catalogService.list(filter(category, section, cut, collection, q, inStock, size, color, minPrice, maxPrice),
                page, pageSize, CatalogSort.parse(sort));
    }

    /** Counts for the filter sidebar, e.g. "Sport (4)". Takes the same filters as the list. */
    @GetMapping("/products/facets")
    public Facets facets(
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) String section,
            @RequestParam(required = false) String cut,
            @RequestParam(required = false) String collection,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean inStock,
            @RequestParam(required = false) String size,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice) {
        return catalogService.facets(filter(category, section, cut, collection, q, inStock, size, color, minPrice, maxPrice));
    }

    /** The admin-managed sections and cuts, for navigation and filter menus. */
    @GetMapping("/catalog/terms")
    public TermsView terms() {
        return catalogService.terms();
    }

    @GetMapping("/products/{slug}")
    public ProductDetail detail(@PathVariable String slug) {
        return catalogService.detail(slug);
    }

    private static CatalogFilter filter(Category category, String section, String cut, String collection, String q,
                                        boolean inStock, String size, String color,
                                        BigDecimal minPrice, BigDecimal maxPrice) {
        return new CatalogFilter(category, blankToNull(section), blankToNull(cut), blankToNull(collection), blankToNull(q),
                inStock, blankToNull(size), blankToNull(color), minPrice, maxPrice);
    }

    private static String blankToNull(String s) {
        return StringUtils.hasText(s) ? s.trim() : null;
    }
}
