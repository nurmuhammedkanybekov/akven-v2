package com.akven.thesis.order;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The dashboard's sales and running-out list. The test database is shared, so the sales figures are checked by what
 * this test adds; the running-out list by the sock it creates.
 */
class ShopSummaryTest extends IntegrationTest {

    @Autowired private OrderTestData data;

    private JsonNode summary() throws Exception {
        return json(getJson("/api/admin/summary?days=7", tokenFor(Role.ADMIN)).andExpect(status().isOk()));
    }

    private void buy(Variant v, int quantity) throws Exception {
        String token = tokenForEmail("buyer-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test", Role.CUSTOMER);
        Map<String, Object> body = Map.of("items", List.of(Map.of("sku", v.getSku(), "quantity", quantity)),
                "fulfillment", Map.of("method", "PICKUP", "contactName", "Venera", "contactPhone", "+996700123456"),
                "payment", Map.of("method", "APPLE_PAY", "token", "sim_apple_abcdef123456"));
        mockMvc.perform(post("/api/orders").header("Authorization", token).header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType("application/json").content(objectMapper.writeValueAsString(body))).andExpect(status().isCreated());
    }

    @Test
    void salesCountPaidOrdersAndPairsAndThePaidOnesWaitToBeHandedOver() throws Exception {
        JsonNode before = summary();
        Variant pack = data.pack(3, 50);
        buy(pack, 2);
        buy(data.variant(50), 1);

        JsonNode after = summary();
        JsonNode s0 = before.get("sales"), s1 = after.get("sales");
        assertThat(s1.get("orders").asInt() - s0.get("orders").asInt()).isEqualTo(2);
        assertThat(s1.get("pairs").asInt() - s0.get("pairs").asInt()).as("two packs of three and one pair").isEqualTo(7);
        assertThat(s1.get("revenue").decimalValue()).isGreaterThan(s0.get("revenue").decimalValue());
        assertThat(s1.get("averageOrder").decimalValue()).isPositive();
        assertThat(after.get("toHandOver").asInt() - before.get("toHandOver").asInt()).isEqualTo(2);
        assertThat(after.toString()).doesNotContain("costPrice", "marginFloor");
    }

    @Test
    void aSockRunningOutIsListedWithWhatIsOnTheWay() throws Exception {
        Variant lastOne = data.variant(1);
        JsonNode s = summary();
        assertThat(s.get("fewLeftThreshold").asInt()).isPositive();
        boolean listed = false;
        for (JsonNode line : s.get("lowStock")) {
            if (line.get("sku").asText().equals(lastOne.getSku())) {
                listed = true;
                assertThat(line.get("available").asInt()).isEqualTo(1);
            }
        }
        // The list is capped; the sock is listed unless a dozen others are emptier, which the order of the list shows.
        JsonNode lines = s.get("lowStock");
        assertThat(listed || lines.get(lines.size() - 1).get("available").asInt() <= 1).isTrue();
        for (int i = 1; i < lines.size(); i++) {
            assertThat(lines.get(i).get("available").asInt()).isGreaterThanOrEqualTo(lines.get(i - 1).get("available").asInt());
        }
    }

    @Test
    void theSummaryIsForTheShopTeamOnly() throws Exception {
        getJson("/api/admin/summary", tokenFor(Role.STAFF)).andExpect(status().isOk());
        getJson("/api/admin/summary", tokenFor(Role.CUSTOMER)).andExpect(status().isForbidden());
        getJson("/api/admin/summary", null).andExpect(status().isUnauthorized());
        getJson("/api/admin/summary?days=0", tokenFor(Role.ADMIN)).andExpect(status().isBadRequest());
    }
}
