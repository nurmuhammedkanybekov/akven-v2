package com.akven.thesis.catalog;

import com.akven.thesis.audit.AuditLogRepository;
import com.akven.thesis.pricing.ShopPolicyRepository;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * What customers are told about stock: in stock, only a few left, coming in N days, or sold out. Staff record what is
 * on the way; a date in the past or a date without incoming stock is refused. Deliveries carry a country.
 */
class StockStatusTest extends IntegrationTest {

    @Autowired private OrderTestData data;
    @Autowired private ShopPolicyRepository policies;
    @Autowired private AuditLogRepository auditLog;

    private static final LocalDate TODAY = LocalDate.now(CatalogService.SHOP_ZONE);

    @AfterEach
    void putThePolicyBack() {
        policies.deleteAll();
    }

    private JsonNode variantOnPage(Variant v) throws Exception {
        String slug = v.getProduct().getSlug();
        return json(getJson("/api/products/" + slug, null).andExpect(status().isOk())).get("variants").get(0);
    }

    private Map<String, Object> supply(Integer casePairs, int incoming, LocalDate eta) {
        Map<String, Object> m = new HashMap<>();
        m.put("casePairs", casePairs);
        m.put("incomingQty", incoming);
        m.put("restockEta", eta == null ? null : eta.toString());
        return m;
    }

    // ---- the four states --------------------------------------------------------------------

    @Test
    void plentyIsInStockAndAFewIsFewLeft() throws Exception {
        assertThat(variantOnPage(data.variant(40)).get("stockStatus").asText()).isEqualTo("IN_STOCK");
        JsonNode few = variantOnPage(data.variant(3));
        assertThat(few.get("stockStatus").asText()).isEqualTo("FEW_LEFT");
        assertThat(few.get("availableQty").asInt()).isEqualTo(3);
        assertThat(few.get("restockInDays").isNull()).isTrue();

        sendJson("PUT", "/api/admin/pricing/policy", tokenFor(Role.ADMIN),
                Map.of("minOrderPairs", 1, "trustedMinOrderPairs", 1, "trustedAfterOrders", 3, "fewLeftThreshold", 2)).andExpect(status().isOk());
        assertThat(variantOnPage(data.variant(3)).get("stockStatus").asText()).isEqualTo("IN_STOCK");
    }

    @Test
    void soldOutWithStockOnTheWayIsComingSoonWithTheDaysLeft() throws Exception {
        Variant v = data.variant(0);
        sendJson("PUT", "/api/admin/variants/" + v.getId() + "/supply", tokenFor(Role.STAFF), supply(250, 120, TODAY.plusDays(12)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.incomingQty").value(120))
                .andExpect(jsonPath("$.casePairs").value(250));
        JsonNode shown = variantOnPage(v);
        assertThat(shown.get("stockStatus").asText()).isEqualTo("COMING_SOON");
        assertThat(shown.get("restockInDays").asInt()).isEqualTo(12);
        assertThat(shown.get("restockEta").asText()).isEqualTo(TODAY.plusDays(12).toString());
        assertThat(shown.get("casePairs").asInt()).isEqualTo(250);
        assertThat(auditLog.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("VARIANT", v.getId()))
                .extracting("action").contains("VARIANT_SUPPLY_UPDATED");
    }

    @Test
    void soldOutWithNothingOnTheWayIsSoldOut() throws Exception {
        JsonNode shown = variantOnPage(data.variant(0));
        assertThat(shown.get("stockStatus").asText()).isEqualTo("SOLD_OUT");
        assertThat(shown.get("restockEta").isNull()).isTrue();
    }

    @Test
    void aMissedArrivalDateReadsAsSoldOut() {
        Variant v = new Variant(null, "X", "M", "Navy", 1, BigDecimal.TEN, BigDecimal.ONE, BigDecimal.TEN);
        v.setStockQty(0);
        v.updateSupply(null, 50, TODAY.minusDays(1));
        assertThat(v.stockStatus(5, TODAY)).isEqualTo(StockStatus.SOLD_OUT);
        v.updateSupply(null, 50, TODAY);
        assertThat(v.stockStatus(5, TODAY)).isEqualTo(StockStatus.COMING_SOON);
    }

    // ---- recording supply -------------------------------------------------------------------

    @Test
    void impossibleSupplyIsRefused() throws Exception {
        Variant v = data.variant(0);
        String staff = tokenFor(Role.STAFF);
        sendJson("PUT", "/api/admin/variants/" + v.getId() + "/supply", staff, supply(null, 10, TODAY.minusDays(3)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("The arrival date cannot be in the past."));
        sendJson("PUT", "/api/admin/variants/" + v.getId() + "/supply", staff, supply(null, 0, TODAY.plusDays(3)))
                .andExpect(status().isBadRequest());
        sendJson("PUT", "/api/admin/variants/" + v.getId() + "/supply", staff, supply(0, 0, null)).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/admin/variants/" + v.getId() + "/supply", tokenFor(Role.CUSTOMER), supply(null, 1, null))
                .andExpect(status().isForbidden());
    }

    // ---- delivery countries -----------------------------------------------------------------

    private JsonNode order(Map<String, Object> fulfillment) throws Exception {
        Variant v = data.variant(10);
        String buyer = tokenForEmail("country-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test", Role.CUSTOMER);
        Map<String, Object> body = Map.of("items", List.of(Map.of("sku", v.getSku(), "quantity", 1)), "fulfillment", fulfillment,
                "payment", Map.of("method", "APPLE_PAY", "token", "sim_apple_abcdef123456"));
        return json(mockMvc.perform(post("/api/orders").header("Authorization", buyer).header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType("application/json").content(objectMapper.writeValueAsString(body))));
    }

    @Test
    void deliveriesCarryACountryAndPickupsDoNot() throws Exception {
        Map<String, Object> almaty = new HashMap<>(Map.of("method", "DELIVERY", "contactName", "Aigerim", "contactPhone", "+77001234567",
                "address", "Almaty, Abay 10", "country", "KZ"));
        assertThat(order(almaty).get("fulfillment").get("country").asText()).isEqualTo("KZ");

        almaty.remove("country");
        assertThat(order(almaty).get("fulfillment").get("country").asText()).as("Kyrgyzstan unless said otherwise").isEqualTo("KG");

        JsonNode pickup = order(Map.of("method", "PICKUP", "contactName", "Aida", "contactPhone", "+996700000000", "country", "RU"));
        assertThat(pickup.get("fulfillment").get("country").isNull()).isTrue();

        almaty.put("country", "US");
        assertThat(order(almaty).get("status").asInt()).isEqualTo(400);
    }
}
