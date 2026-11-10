package com.akven.thesis.catalog;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

/**
 * The sitemap search engines read (sitemaps.org): the shop's public pages and every sock on sale, at the shop's own
 * address (akven.public-url). The web server serves it as /sitemap.xml. Only active products are listed, so a
 * retired sock leaves the map as it leaves the shelves.
 */
@RestController
public class SitemapController {

    static final List<String> PAGES = List.of("/", "/shop", "/men", "/women", "/kids", "/bundles", "/gifts", "/sizes",
            "/fitting", "/family", "/story", "/visit", "/wholesale", "/finder", "/privacy");

    private final ProductRepository products;
    private final String base;

    public SitemapController(ProductRepository products, @Value("${akven.public-url:http://localhost:8081}") String base) {
        this.products = products;
        this.base = base.replaceAll("/+$", "");
    }

    @GetMapping(value = "/api/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    @Transactional(readOnly = true)
    public String sitemap() {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        for (String page : PAGES) url(xml, base + page);
        products.findByActiveTrue().stream().map(Product::getSlug).sorted(Comparator.naturalOrder())
                .forEach(slug -> url(xml, base + "/products/" + slug));
        return xml.append("</urlset>\n").toString();
    }

    /** Slugs are lower-case letters, digits and hyphens (Slugs), but the address is escaped anyway. */
    private static void url(StringBuilder xml, String loc) {
        xml.append("  <url><loc>").append(loc.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")).append("</loc></url>\n");
    }
}
