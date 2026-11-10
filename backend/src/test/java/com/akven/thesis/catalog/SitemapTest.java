package com.akven.thesis.catalog;

import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The sitemap lists the public pages and the socks on sale, at the shop's own address, and nobody needs to sign in. */
class SitemapTest extends IntegrationTest {

    @Autowired private OrderTestData data;
    @Autowired private ProductRepository products;

    @Test
    void listsThePagesAndTheSocksOnSaleButNotARetiredOne() throws Exception {
        Product onSale = data.variant(3).getProduct();
        Product retired = data.variant(3).getProduct();
        retired.retire();
        products.saveAndFlush(retired);

        String xml = mockMvc.perform(get("/api/sitemap.xml"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/xml"))
                .andReturn().getResponse().getContentAsString();
        assertThat(xml).startsWith("<?xml").contains("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">")
                .contains("<loc>http://localhost:8081/shop</loc>")
                .contains("/products/" + onSale.getSlug() + "</loc>")
                .doesNotContain("/products/" + retired.getSlug() + "<")
                .doesNotContain("/admin").doesNotContain("/checkout");
    }
}
