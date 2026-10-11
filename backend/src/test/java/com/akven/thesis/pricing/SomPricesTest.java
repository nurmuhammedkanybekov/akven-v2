package com.akven.thesis.pricing;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Prices stay in dollars; the owners set the som rate and rounding, everyone can read them, and the chat can speak som. */
class SomPricesTest extends IntegrationTest {

    @Autowired private OrderTestData data;
    @Autowired private JdbcTemplate jdbc;

    @AfterEach
    void putThePolicyBack() {
        jdbc.update("delete from shop_policy");
    }

    private Map<String, Object> policy(Object rate, Object rounding) {
        Map<String, Object> body = new HashMap<>(Map.of("minOrderPairs", 1, "trustedMinOrderPairs", 1, "trustedAfterOrders", 3));
        body.put("somPerUsd", rate);
        body.put("somRounding", rounding);
        return body;
    }

    @Test
    void roundingFollowsTheOwnersStep() {
        ShopPolicy p = ShopPolicy.defaults();
        p.updateSom(new BigDecimal("87.50"), 10);
        assertThat(p.toSom(new BigDecimal("7.50"))).isEqualTo(660);    // 656.25 -> 660
        p.updateSom(new BigDecimal("87.50"), 1);
        assertThat(p.toSom(new BigDecimal("7.50"))).isEqualTo(656);
        p.updateSom(new BigDecimal("87.50"), 50);
        assertThat(p.toSom(new BigDecimal("7.50"))).isEqualTo(650);
    }

    @Test
    void ownersSetTheRateAndEveryoneSeesIt() throws Exception {
        sendJson("PUT", "/api/admin/pricing/policy", tokenFor(Role.ADMIN), policy(88, 5)).andExpect(status().isOk())
                .andExpect(jsonPath("$.somPerUsd").value(88)).andExpect(jsonPath("$.somRounding").value(5));
        getJson("/api/pricing", null).andExpect(status().isOk())
                .andExpect(jsonPath("$.somPerUsd").value(88)).andExpect(jsonPath("$.somRounding").value(5));
        sendJson("PUT", "/api/admin/pricing/policy", tokenFor(Role.SUPER_ADMIN), policy(87.5, 10)).andExpect(status().isOk());
        sendJson("PUT", "/api/admin/pricing/policy", tokenFor(Role.STAFF), policy(1, 10)).andExpect(status().isForbidden());
    }

    @Test
    void aBadRateOrRoundingIsRefused() throws Exception {
        sendJson("PUT", "/api/admin/pricing/policy", tokenFor(Role.ADMIN), policy(0, 10)).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/admin/pricing/policy", tokenFor(Role.ADMIN), policy(87.5, 7)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Som prices can be rounded to 1, 5, 10, 50 or 100 som."));
    }

    @Test
    void theChatQuotesSomWhenTheCustomerReadsSom() throws Exception {
        Variant v = data.variant(5); // 10.00, floor 15%
        String token = tokenForEmail("som-" + System.nanoTime() + "@akven.test", Role.CUSTOMER);
        JsonNode r = json(sendJson("POST", "/api/negotiate", token,
                Map.of("variantSku", v.getSku(), "message", "50% please", "language", "ru", "currency", "KGS")).andExpect(status().isOk()));
        assertThat(r.get("reply").asText()).contains("740 сом").doesNotContain("$");     // 8.50 * 87.50 = 743.75 -> 740
        assertThat(r.get("offerPrice").decimalValue()).isEqualByComparingTo("8.50");          // the offer itself stays in dollars
        JsonNode en = json(sendJson("POST", "/api/negotiate", token,
                Map.of("variantSku", v.getSku(), "message", "50% please", "currency", "KGS")).andExpect(status().isOk()));
        assertThat(en.get("reply").asText()).contains("740 som");
        sendJson("POST", "/api/negotiate", token, Map.of("variantSku", v.getSku(), "message", "hi", "currency", "EUR"))
                .andExpect(status().isBadRequest());
    }
}
