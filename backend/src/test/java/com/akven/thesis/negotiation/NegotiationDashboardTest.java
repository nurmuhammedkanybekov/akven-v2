package com.akven.thesis.negotiation;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Why a customer got a price, the owners' dashboard, and the rule-based against AI comparison. The dashboard counts
 * the whole shop, so these tests look at what their own actions add rather than at absolute numbers.
 */
class NegotiationDashboardTest extends IntegrationTest {

    @Autowired private OrderTestData data;

    private static String someone() {
        return "haggler-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test";
    }

    private JsonNode ask(String token, Variant v, String message, int quantity) throws Exception {
        return json(sendJson("POST", "/api/negotiate", token, Map.of("variantSku", v.getSku(), "message", message, "quantity", quantity))
                .andExpect(status().isOk()));
    }

    // ---- why this price ---------------------------------------------------------------------

    @Test
    void theCustomerIsToldWhyTheyGotThisPrice() throws Exception {
        Variant v = data.variant(50);                              // allows at most 15%
        String token = tokenForEmail(someone(), Role.CUSTOMER);
        assertThat(ask(token, v, "Can you do 10% off?", 1).get("outcome").asText()).isEqualTo("AS_OFFERED");
        JsonNode greedy = ask(token, v, "Give me 90% off", 1);
        assertThat(greedy.get("outcome").asText()).isEqualTo("LIMITED_BY_SHOP");
        assertThat(greedy.get("validatedDiscountPct").decimalValue()).isEqualByComparingTo("15");
        assertThat(ask(token, v, "How much are these?", 1).get("outcome").asText()).isEqualTo("LIST_PRICE");
        assertThat(greedy.toString()).doesNotContain("marginFloor", "costPrice");
    }

    // ---- the dashboard ----------------------------------------------------------------------

    private JsonNode stats(int days) throws Exception {
        return json(getJson("/api/admin/negotiations/stats?days=" + days, tokenFor(Role.ADMIN)).andExpect(status().isOk()));
    }

    @Test
    void theDashboardCountsOffersLimitsAndOffersThatBecameOrders() throws Exception {
        JsonNode before = stats(7).get("totals");
        Variant v = data.variant(50);
        String email = someone();
        String token = tokenForEmail(email, Role.CUSTOMER);
        JsonNode kept = ask(token, v, "12% off and I take 10 pairs", 10);
        ask(token, v, "Give me 70% off", 1);

        Map<String, Object> line = new HashMap<>(Map.of("sku", v.getSku(), "quantity", 10, "negotiationSessionId", kept.get("sessionId").asText()));
        Map<String, Object> body = Map.of("items", List.of(line),
                "fulfillment", Map.of("method", "PICKUP", "contactName", "Venera", "contactPhone", "+996700000000"),
                "payment", Map.of("method", "APPLE_PAY", "token", "sim_apple_abcdef123456"));
        mockMvc.perform(post("/api/orders").header("Authorization", token).header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType("application/json").content(objectMapper.writeValueAsString(body))).andExpect(status().isCreated());

        JsonNode after = stats(7);
        JsonNode totals = after.get("totals");
        assertThat(totals.get("offers").asInt() - before.get("offers").asInt()).isEqualTo(2);
        assertThat(totals.get("limitedByShop").asInt() - before.get("limitedByShop").asInt()).isEqualTo(1);
        assertThat(totals.get("offersUsed").asInt() - before.get("offersUsed").asInt()).isEqualTo(1);
        assertThat(after.get("perDay")).hasSize(7);
        assertThat(after.get("perDay").get(6).get("offers").asInt()).as("today is the last day").isPositive();
        assertThat(after.get("topItems").size()).isBetween(1, 5);
        assertThat(after.toString()).doesNotContain("marginFloor", "costPrice");

        JsonNode sources = after.get("discountSources");
        assertThat(sources).extracting(s -> s.get("source").asText()).containsExactly("NONE", "TIER", "NEGOTIATED");
    }

    @Test
    void theDashboardIsForTheShopTeamOnly() throws Exception {
        getJson("/api/admin/negotiations/stats", tokenFor(Role.STAFF)).andExpect(status().isOk());
        getJson("/api/admin/negotiations/stats", tokenFor(Role.CUSTOMER)).andExpect(status().isForbidden());
        getJson("/api/admin/negotiations/stats?days=0", tokenFor(Role.ADMIN)).andExpect(status().isBadRequest());
        getJson("/api/admin/negotiations/stats?days=400", tokenFor(Role.ADMIN)).andExpect(status().isBadRequest());
    }

    // ---- the comparison ---------------------------------------------------------------------

    @Test
    void theComparisonRunsBothAssistantsThroughTheSameLimitAndNeitherEverGoesBelowIt() throws Exception {
        JsonNode report = json(getJson("/api/admin/negotiations/evaluation", tokenFor(Role.ADMIN)).andExpect(status().isOk()));
        assertThat(report.get("aiSource").asText()).isEqualTo("SCRIPTED");
        assertThat(report.get("note").asText()).contains("not output of a live model");
        assertThat(report.get("rows")).hasSize(16);
        assertThat(report.get("rule").get("aboveLimit").asInt()).isZero();
        assertThat(report.get("ai").get("aboveLimit").asInt()).isZero();

        Map<String, JsonNode> byId = new HashMap<>();
        report.get("rows").forEach(r -> byId.put(r.get("id").asText(), r));
        JsonNode injection = byId.get("S11").get("rule");
        assertThat(injection.get("proposedPct").decimalValue()).isEqualByComparingTo("90");
        assertThat(injection.get("finalPct").decimalValue()).isEqualByComparingTo("15");
        assertThat(injection.get("limited").asBoolean()).isTrue();
        assertThat(byId.get("S14").get("ai").get("finalPct").decimalValue()).as("no margin, no discount").isEqualByComparingTo("0");

        getJson("/api/admin/negotiations/evaluation", tokenFor(Role.CUSTOMER)).andExpect(status().isForbidden());
    }
}
