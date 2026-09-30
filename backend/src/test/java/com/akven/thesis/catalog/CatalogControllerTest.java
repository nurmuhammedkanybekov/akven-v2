package com.akven.thesis.catalog;

import com.akven.thesis.support.IntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Public storefront API. Most important test in this class: the JSON a customer receives
 * never contains costPrice or marginFloorPct (security requirement, CLAUDE checklist item 10).
 * Test data uses its own collection name so filters are asserted against known rows only.
 */
class CatalogControllerTest extends IntegrationTest {

    private static final String COLLECTION = "ItCollection";

    @Autowired private ProductRepository productRepository;
    @Autowired private VariantRepository variantRepository;
    @Autowired private ProductImageRepository imageRepository;
    @Autowired private CatalogTermRepository termRepository;

    @BeforeEach
    void seed() {
        if (productRepository.existsBySlug("it-men-sport-crew")) {
            return;
        }
        CatalogTerm sport = termRepository.save(new CatalogTerm(TermKind.SECTION, "it-sport", "It Sport", null, 90));
        CatalogTerm casual = termRepository.save(new CatalogTerm(TermKind.SECTION, "it-casual", "It Casual", null, 91));
        CatalogTerm hidden = termRepository.save(new CatalogTerm(TermKind.SECTION, "it-hidden", "It Hidden", null, 92));
        hidden.update("It Hidden", null, false);
        termRepository.save(hidden);
        termRepository.save(new CatalogTerm(TermKind.CUT, "it-crew", "It Crew", null, 90));
        CatalogTerm ankle = termRepository.save(new CatalogTerm(TermKind.CUT, "it-ankle", "It Ankle", null, 91));
        CatalogTerm crew = termRepository.findByKindOrderByPositionAscNameAsc(TermKind.CUT).stream()
                .filter(t -> t.getSlug().equals("it-crew")).findFirst().orElseThrow();
        product("it-men-sport-crew", "Men Sport Crew", Category.MEN, sport, crew,
                variant("IT-MSC-M", "M", "Black", "#1F1D1A", 1, "6.00", "2.40", "15.00", 10));
        product("it-women-ankle", "Women Ankle", Category.WOMEN, casual, ankle,
                variant("IT-WA-S", "S", "Rose", "#E0A7A0", 3, "12.00", "5.00", "20.00", 0));
        product("it-bundle", "Family Bundle", Category.BUNDLES, null, null,
                variant("IT-B-ONE", "One size", "Mixed", null, 10, "30.00", "15.00", "10.00", 5));
        UUID menId = productRepository.findBySlug("it-men-sport-crew").orElseThrow().getId();
        imageRepository.save(new ProductImage(menId, "/media/products/it-men-sport-crew-1.svg", "Men Sport Crew", 0));
        imageRepository.save(new ProductImage(menId, "/media/products/it-men-sport-crew-2.svg", "Side view", 1));
        Product retired = product("it-retired", "Retired Sock", Category.MEN, casual, crew,
                variant("IT-R-M", "M", "Grey", null, 1, "5.00", "2.00", "10.00", 9));
        retired.retire();
        productRepository.save(retired);
    }

    @Test
    void listIsPublicAndNeverLeaksCostOrMarginFloor() throws Exception {
        String body = getJson("/api/products?collection=" + COLLECTION + "&pageSize=48", null)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(body).contains("it-men-sport-crew");
        assertThat(body).doesNotContain("costPrice", "marginFloorPct", "margin", "cost");
    }

    @Test
    void detailIsPublicShowsVariantsAndNeverLeaksCostOrMarginFloor() throws Exception {
        String body = getJson("/api/products/it-men-sport-crew", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Men Sport Crew"))
                .andExpect(jsonPath("$.variants[0].sku").value("IT-MSC-M"))
                .andExpect(jsonPath("$.variants[0].availableQty").value(10))
                .andExpect(jsonPath("$.variants[0].price").value(6.00))
                .andReturn().getResponse().getContentAsString();

        // The seeded cost (2.40) and floor (15.00) must not appear under any name.
        assertThat(body).doesNotContain("costPrice", "marginFloorPct", "2.4", "15.0");
    }

    @Test
    void filtersByCategorySectionAndCut() throws Exception {
        getJson("/api/products?collection=" + COLLECTION + "&category=MEN", null)
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].slug").value("it-men-sport-crew"));

        getJson("/api/products?collection=" + COLLECTION + "&cut=it-ankle", null)
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].slug").value("it-women-ankle"))
                .andExpect(jsonPath("$.items[0].cut.name").value("It Ankle"));

        getJson("/api/products?collection=" + COLLECTION + "&section=it-sport", null)
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].slug").value("it-men-sport-crew"))
                .andExpect(jsonPath("$.items[0].section.slug").value("it-sport"));

        getJson("/api/products?collection=" + COLLECTION + "&category=BUNDLES", null)
                .andExpect(jsonPath("$.items[0].slug").value("it-bundle"))
                .andExpect(jsonPath("$.items[0].cut").doesNotExist())
                .andExpect(jsonPath("$.items[0].section").doesNotExist());
    }

    @Test
    void publicTermsListOnlyActiveOnesInAdminOrder() throws Exception {
        getJson("/api/catalog/terms", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections[?(@.slug=='it-sport')].name").value("It Sport"))
                .andExpect(jsonPath("$.sections[?(@.slug=='it-hidden')]").isEmpty())
                .andExpect(jsonPath("$.cuts[?(@.slug=='it-ankle')].name").value("It Ankle"));
        String body = getJson("/api/catalog/terms", null).andReturn().getResponse().getContentAsString();
        assertThat(body.indexOf("it-sport")).isLessThan(body.indexOf("it-casual"));   // position 90 before 91
    }

    @Test
    void inStockFilterHidesProductsWithNothingAvailable() throws Exception {
        getJson("/api/products?collection=" + COLLECTION + "&inStock=true", null)
                .andExpect(jsonPath("$.totalItems").value(2));   // women-ankle has stock 0
    }

    @Test
    void variantFiltersApplyToTheSameVariant() throws Exception {
        // size S exists (women-ankle) but has no stock; size M exists (men crew) with stock.
        getJson("/api/products?collection=" + COLLECTION + "&size=S&inStock=true", null)
                .andExpect(jsonPath("$.totalItems").value(0));
        getJson("/api/products?collection=" + COLLECTION + "&size=m&inStock=true", null)
                .andExpect(jsonPath("$.totalItems").value(1));
        getJson("/api/products?collection=" + COLLECTION + "&minPrice=10&maxPrice=20", null)
                .andExpect(jsonPath("$.items[0].slug").value("it-women-ankle"))
                .andExpect(jsonPath("$.totalItems").value(1));
    }

    @Test
    void facetsCountEachDimensionIgnoringItsOwnSelection() throws Exception {
        // Only our three "It" products have this collection: MEN sport/crew, WOMEN casual/ankle, BUNDLES.
        getJson("/api/products/facets?collection=" + COLLECTION, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category.MEN").value(1))
                .andExpect(jsonPath("$.category.WOMEN").value(1))
                .andExpect(jsonPath("$.category.BUNDLES").value(1))
                .andExpect(jsonPath("$.category.KIDS").value(0))
                .andExpect(jsonPath("$.section[?(@.slug=='it-sport')].count").value(1))
                .andExpect(jsonPath("$.section[?(@.slug=='it-casual')].count").value(1))
                .andExpect(jsonPath("$.section[?(@.slug=='it-hidden')]").isEmpty())   // hidden terms are not offered
                .andExpect(jsonPath("$.cut[?(@.slug=='it-crew')].count").value(1));

        // Choosing category=MEN narrows section/cut counts, but the category counts still show the alternatives.
        getJson("/api/products/facets?collection=" + COLLECTION + "&category=MEN", null)
                .andExpect(jsonPath("$.category.WOMEN").value(1))
                .andExpect(jsonPath("$.cut[?(@.slug=='it-ankle')].count").value(0))
                .andExpect(jsonPath("$.cut[?(@.slug=='it-crew')].count").value(1));
    }

    @Test
    void detailCarriesQualityCareOriginAndColourSwatches() throws Exception {
        getJson("/api/products/it-men-sport-crew", null)
                .andExpect(jsonPath("$.quality").value("Premium test cotton"))
                .andExpect(jsonPath("$.care").value("Wash cold"))
                .andExpect(jsonPath("$.origin").value("Korea"))
                .andExpect(jsonPath("$.section.name").value("It Sport"))
                .andExpect(jsonPath("$.variants[0].colorHex").value("#1F1D1A"));
        getJson("/api/products?collection=" + COLLECTION + "&category=MEN", null)
                .andExpect(jsonPath("$.items[0].colors[0]").value("#1F1D1A"));
    }

    @Test
    void sortsByPriceAscendingAndDescending() throws Exception {
        // cheapest variants: men crew 6.00, bundle 30.00, women ankle 12.00
        getJson("/api/products?collection=" + COLLECTION + "&sort=price_asc", null)
                .andExpect(jsonPath("$.items[0].slug").value("it-men-sport-crew"))
                .andExpect(jsonPath("$.items[1].slug").value("it-women-ankle"))
                .andExpect(jsonPath("$.items[2].slug").value("it-bundle"))
                .andExpect(jsonPath("$.totalItems").value(3));
        getJson("/api/products?collection=" + COLLECTION + "&sort=price_desc", null)
                .andExpect(jsonPath("$.items[0].slug").value("it-bundle"))
                .andExpect(jsonPath("$.items[2].slug").value("it-men-sport-crew"));
    }

    @Test
    void coverImageOnCardsAndAllImagesOnDetail() throws Exception {
        getJson("/api/products?collection=" + COLLECTION + "&category=MEN", null)
                .andExpect(jsonPath("$.items[0].image.url").value("/media/products/it-men-sport-crew-1.svg"))
                .andExpect(jsonPath("$.items[0].image.alt").value("Men Sport Crew"));
        getJson("/api/products/it-men-sport-crew", null)
                .andExpect(jsonPath("$.images.length()").value(2))
                .andExpect(jsonPath("$.images[0].url").value("/media/products/it-men-sport-crew-1.svg"))
                .andExpect(jsonPath("$.images[1].alt").value("Side view"));
        // A product with no pictures still renders, with no image.
        getJson("/api/products?collection=" + COLLECTION + "&category=BUNDLES", null)
                .andExpect(jsonPath("$.items[0].image").doesNotExist());
    }

    @Test
    void summaryCarriesFromPriceAndStockFlag() throws Exception {
        getJson("/api/products?collection=" + COLLECTION + "&category=WOMEN", null)
                .andExpect(jsonPath("$.items[0].minPrice").value(12.00))
                .andExpect(jsonPath("$.items[0].inStock").value(false));
    }

    @Test
    void searchMatchesNameAndTreatsWildcardsAsPlainText() throws Exception {
        getJson("/api/products?q=family bundle", null).andExpect(jsonPath("$.totalItems").value(1));
        getJson("/api/products?q=%", null).andExpect(jsonPath("$.totalItems").value(0));
    }

    @Test
    void retiredProductsAreHiddenEverywhere() throws Exception {
        assertThat(getJson("/api/products?collection=" + COLLECTION + "&pageSize=48", null)
                .andReturn().getResponse().getContentAsString()).doesNotContain("it-retired");
        getJson("/api/products/it-retired", null).andExpect(status().isNotFound());
    }

    @Test
    void unknownProductIs404InProblemDetailFormat() throws Exception {
        getJson("/api/products/does-not-exist", null)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").exists());
    }

    @Test
    void invalidEnumValueIs400() throws Exception {
        getJson("/api/products?category=SHOES", null).andExpect(status().isBadRequest());
    }

    @Test
    void pageSizeIsCapped() throws Exception {
        getJson("/api/products?pageSize=100000", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(CatalogService.MAX_PAGE_SIZE));
    }

    // ---- helpers ---------------------------------------------------------------------------

    private Product product(String slug, String name, Category c, CatalogTerm section, CatalogTerm cut, Variant v) {
        Product p = new Product(slug, name, c, section, cut, COLLECTION, "desc", "100% cotton");
        p.setDetails("Premium test cotton", "Wash cold", "Korea");
        p = productRepository.save(p);
        setProduct(v, p);
        variantRepository.save(v);
        return p;
    }

    private static Variant variant(String sku, String size, String color, String hex, int pack,
                                   String price, String cost, String floor, int stock) {
        Variant v = new Variant(null, sku, size, color, pack, new BigDecimal(price), new BigDecimal(cost),
                new BigDecimal(floor));
        v.setColorHex(hex);
        v.setStockQty(stock);
        return v;
    }

    private static void setProduct(Variant v, Product p) {
        org.springframework.test.util.ReflectionTestUtils.setField(v, "product", p);
    }
}
