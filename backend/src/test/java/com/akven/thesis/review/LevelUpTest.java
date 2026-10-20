package com.akven.thesis.review;

import com.akven.thesis.catalog.Category;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.ResultActions;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The "level up" round: verified-buyer reviews with moderation, saved socks in the account, the same design for the
 * rest of the family, pairs sold this week, the owners' daily sales and the orders file.
 */
class LevelUpTest extends IntegrationTest {

    @Autowired private OrderTestData data;

    private static String email(String who) { return who + "-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test"; }

    private ResultActions checkout(String bearer, Variant v, int qty, String contactName) throws Exception {
        Map<String, Object> body = Map.of("items", List.of(Map.of("sku", v.getSku(), "quantity", qty)),
                "fulfillment", Map.of("method", "PICKUP", "contactName", contactName, "contactPhone", "+996 700 123 456"),
                "payment", Map.of("method", "APPLE_PAY", "token", "sim_apple_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12)));
        return mockMvc.perform(post("/api/orders").contentType("application/json").content(objectMapper.writeValueAsString(body))
                .header("Authorization", bearer).header("Idempotency-Key", UUID.randomUUID().toString()));
    }

    private Map<String, Object> review(int rating, String author, String body) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("rating", rating);
        m.put("author", author);
        m.put("body", body);
        return m;
    }

    @Test
    void onlyACustomerWhoReceivedTheSockReviewsItAndNothingShowsUntilApproved() throws Exception {
        Variant v = data.variant(20);
        String slug = v.getProduct().getSlug();
        String buyer = tokenForEmail(email("buyer"), Role.CUSTOMER);
        String stranger = tokenForEmail(email("stranger"), Role.CUSTOMER);

        sendJson("PUT", "/api/reviews/" + slug, stranger, review(5, "Eve", "Lovely socks, very soft.")).andExpect(status().isBadRequest());
        assertThat(json(getJson("/api/reviews/" + slug + "/mine", stranger)).get("canReview").asBoolean()).isFalse();

        JsonNode order = json(checkout(buyer, v, 2, "Aida").andExpect(status().isCreated()));
        // Paid is not enough: the sock has to reach the customer.
        sendJson("PUT", "/api/reviews/" + slug, buyer, review(5, "Aida", "Lovely socks, very soft.")).andExpect(status().isBadRequest());
        sendJson("POST", "/api/admin/orders/" + order.get("id").asText() + "/fulfil", tokenFor(Role.STAFF), Map.of()).andExpect(status().isOk());

        sendJson("PUT", "/api/reviews/" + slug, buyer, review(6, "Aida", "Lovely socks, very soft.")).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/reviews/" + slug, buyer, review(5, "<b>Aida</b>", "Lovely socks, very soft.")).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/reviews/" + slug, buyer, review(5, "Aida", "short")).andExpect(status().isBadRequest());
        JsonNode mine = json(sendJson("PUT", "/api/reviews/" + slug, buyer,
                review(5, "  Aida ", "Lovely socks,\u0007 very soft.\n\n\n\nWarm in winter.")).andExpect(status().isOk()));
        assertThat(mine.get("status").asText()).isEqualTo("PENDING");
        assertThat(mine.get("body").asText()).isEqualTo("Lovely socks, very soft.\n\nWarm in winter.");
        assertThat(json(getJson("/api/products/" + slug + "/reviews", null)).get("count").asInt()).isZero();

        getJson("/api/admin/reviews", buyer).andExpect(status().isForbidden());
        JsonNode waiting = json(getJson("/api/admin/reviews", tokenFor(Role.STAFF)).andExpect(status().isOk()));
        String id = null;
        for (JsonNode w : waiting) if (w.get("productSlug").asText().equals(slug)) id = w.get("id").asText();
        assertThat(id).isNotNull();
        sendJson("PUT", "/api/admin/reviews/" + id, tokenFor(Role.STAFF), Map.of("status", "APPROVED")).andExpect(status().isNoContent());

        JsonNode shown = json(getJson("/api/products/" + slug + "/reviews", null).andExpect(status().isOk()));
        assertThat(shown.get("count").asInt()).isEqualTo(1);
        assertThat(shown.get("average").asDouble()).isEqualTo(5.0);
        assertThat(shown.get("counts").get(4).asInt()).isEqualTo(1);
        assertThat(shown.get("reviews").get(0).get("author").asText()).isEqualTo("Aida");
        assertThat(shown.toString()).doesNotContain("@akven.test");               // no email ever shown
        assertThat(json(getJson("/api/catalog/reviews?limit=12", null))).anySatisfy(r -> assertThat(r.get("productSlug").asText()).isEqualTo(slug));

        // Writing again sends it back for approval: it disappears until the owners look again.
        sendJson("PUT", "/api/reviews/" + slug, buyer, review(3, null, "Changed my mind a little.")).andExpect(status().isOk());
        assertThat(json(getJson("/api/products/" + slug + "/reviews", null)).get("count").asInt()).isZero();
        sendJson("PUT", "/api/admin/reviews/" + id, tokenFor(Role.STAFF), Map.of("status", "PENDING")).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/admin/reviews/" + id, tokenFor(Role.STAFF), Map.of("status", "REJECTED")).andExpect(status().isNoContent());
        assertThat(json(getJson("/api/reviews/" + slug + "/mine", buyer)).get("status").asText()).isEqualTo("REJECTED");
    }

    @Test
    void savedSocksFollowTheAccountAndTheBrowsersListIsMergedIn() throws Exception {
        String me = tokenForEmail(email("saver"), Role.CUSTOMER);
        Variant a = data.variant(5), b = data.variant(5), c = data.variant(5);
        sendJson("PUT", "/api/saved/" + a.getProduct().getSlug(), me, Map.of()).andExpect(status().isOk());
        sendJson("PUT", "/api/saved/" + a.getProduct().getSlug(), me, Map.of()).andExpect(status().isOk());      // twice is once
        JsonNode merged = json(sendJson("POST", "/api/saved/merge", me,
                Map.of("slugs", List.of(b.getProduct().getSlug(), c.getProduct().getSlug(), "no-such-sock"))).andExpect(status().isOk()));
        assertThat(merged).hasSize(3);
        sendJson("POST", "/api/saved/merge", me, Map.of("slugs", List.of("../../etc"))).andExpect(status().isBadRequest());
        JsonNode after = json(sendJson("DELETE", "/api/saved/" + b.getProduct().getSlug(), me, Map.of()).andExpect(status().isOk()));
        assertThat(after).hasSize(2);
        assertThat(json(getJson("/api/saved", tokenForEmail(email("other"), Role.CUSTOMER)))).isEmpty();       // someone else's list is theirs
        getJson("/api/saved", null).andExpect(status().isUnauthorized());
    }

    @Test
    void theSameDesignIsOfferedForTheRestOfTheFamily() throws Exception {
        String collection = "Family " + UUID.randomUUID().toString().substring(0, 6);
        Variant dad = data.variantIn(Category.MEN, collection, 5);
        Variant mom = data.variantIn(Category.WOMEN, collection, 5);
        Variant kid = data.variantIn(Category.KIDS, collection, 5);
        data.variantIn(Category.MEN, collection, 5);                                          // same shelf: not "for the family"
        JsonNode matching = json(getJson("/api/products/" + dad.getProduct().getSlug() + "/matching", null).andExpect(status().isOk()));
        assertThat(matching).extracting(n -> n.get("slug").asText())
                .containsExactlyInAnyOrder(mom.getProduct().getSlug(), kid.getProduct().getSlug());
    }

    @Test
    void pairsSoldThisWeekCountRealPaidOrders() throws Exception {
        Variant pack = data.pack(3, 20);
        String slug = pack.getProduct().getSlug();
        assertThat(json(getJson("/api/products/" + slug, null)).get("pairsSoldThisWeek").asInt()).isZero();
        checkout(tokenForEmail(email("pack"), Role.CUSTOMER), pack, 2, "Bakyt").andExpect(status().isCreated());
        assertThat(json(getJson("/api/products/" + slug, null)).get("pairsSoldThisWeek").asInt()).isEqualTo(6);   // 2 packs of 3
    }

    @Test
    void theOwnersSeeSalesByDayAndCanDownloadTheOrdersWithoutFormulasRunning() throws Exception {
        Variant v = data.variant(20);
        checkout(tokenForEmail(email("csv"), Role.CUSTOMER), v, 1, "=HYPERLINK(\"http://evil\",\"x\")").andExpect(status().isCreated());

        JsonNode days = json(getJson("/api/admin/summary/daily?days=7", tokenFor(Role.STAFF)).andExpect(status().isOk()));
        assertThat(days).hasSize(7);
        assertThat(days.get(6).get("orders").asInt()).isGreaterThanOrEqualTo(1);
        getJson("/api/admin/summary/daily?days=0", tokenFor(Role.STAFF)).andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/admin/orders/export?days=7").header("Authorization", tokenFor(Role.STAFF))).andExpect(status().isForbidden());
        String csv = mockMvc.perform(get("/api/admin/orders/export?days=7").header("Authorization", tokenFor(Role.ADMIN)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        assertThat(csv).startsWith("﻿Reference,");
        assertThat(csv).contains("\"'=HYPERLINK(\"\"http://evil\"\",\"\"x\"\")\"");          // defused and quoted
        assertThat(csv).doesNotContain(",=HYPERLINK");
    }
}
