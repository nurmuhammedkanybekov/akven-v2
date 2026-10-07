package com.akven.thesis.pricing;

import com.akven.thesis.audit.AuditLogRepository;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.negotiation.NegotiationSession;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Socks are sold as collections: the minimum counts pairs across the whole cart, packs count all their pairs, trusted
 * customers may order less, the ladder lowers the price per pair, and no step of it (nor a negotiated offer) can go
 * below a sock's own limit. Only owners change any of it, and every change is audited.
 */
class CollectionPricingTest extends IntegrationTest {

    @Autowired private OrderTestData data;
    @Autowired private ShopPolicyRepository policies;
    @Autowired private PriceTierRepository tiers;
    @Autowired private UserRepository users;
    @Autowired private AuditLogRepository auditLog;
    @Autowired private JdbcTemplate jdbc;

    /** Other test classes share this database and expect no minimum and no ladder. */
    @AfterEach
    void putThePricingBack() {
        tiers.deleteAll();
        policies.deleteAll();
    }

    // ---- helpers ----------------------------------------------------------------------------

    private static Map<String, Object> line(Variant v, int qty) {
        return line(v, qty, null);
    }

    private static Map<String, Object> line(Variant v, int qty, UUID offer) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sku", v.getSku());
        m.put("quantity", qty);
        if (offer != null) m.put("negotiationSessionId", offer.toString());
        return m;
    }

    private ResultActions checkout(String bearer, List<Map<String, Object>> items) throws Exception {
        Map<String, Object> body = Map.of("items", items,
                "fulfillment", Map.of("method", "PICKUP", "contactName", "Venera", "contactPhone", "+996 700 000 000"),
                "payment", Map.of("method", "APPLE_PAY", "token", "sim_apple_abcdef123456"));
        return mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/orders")
                .header("Authorization", bearer).header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType("application/json").content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions quote(String bearer, List<Map<String, Object>> items) throws Exception {
        return sendJson("POST", "/api/cart/quote", bearer, Map.of("items", items));
    }

    private void policy(int min, int trustedMin, int trustedAfter) throws Exception {
        sendJson("PUT", "/api/admin/pricing/policy", tokenFor(Role.ADMIN),
                Map.of("minOrderPairs", min, "trustedMinOrderPairs", trustedMin, "trustedAfterOrders", trustedAfter))
                .andExpect(status().isOk());
    }

    private String tier(int minPairs, String pct) throws Exception {
        return json(sendJson("POST", "/api/admin/pricing/tiers", tokenFor(Role.ADMIN), Map.of("minPairs", minPairs, "discountPct", pct))
                .andExpect(status().isCreated())).get("id").asText();
    }

    private static String customer() {
        return "collector-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test";
    }

    // ---- the minimum ------------------------------------------------------------------------

    @Test
    void theMinimumCountsPairsAcrossDifferentSocks() throws Exception {
        policy(10, 5, 3);
        Variant father = data.variant(20), mother = data.variant(20), kids = data.variant(20);
        String buyer = tokenForEmail(customer(), Role.CUSTOMER);

        checkout(buyer, List.of(line(father, 3), line(mother, 3), line(kids, 3)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("The minimum order is 10 pairs. You can mix different socks to reach it."));
        assertThat(data.reload(father).getStockQty()).as("a refused order touches no stock").isEqualTo(20);

        checkout(buyer, List.of(line(father, 3), line(mother, 3), line(kids, 4))).andExpect(status().isCreated());
        // Above the minimum any number is fine, 11 as well as 10.
        checkout(buyer, List.of(line(father, 11))).andExpect(status().isCreated());
    }

    @Test
    void aPackCountsAllItsPairs() throws Exception {
        policy(10, 10, 3);
        Variant pack = data.pack(10, 5);
        checkout(tokenForEmail(customer(), Role.CUSTOMER), List.of(line(pack, 1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.items[0].quantity").value(1));
    }

    @Test
    void theQuoteExplainsTheMinimumBeforeCheckout() throws Exception {
        policy(10, 5, 3);
        Variant v = data.variant(20);
        quote(null, List.of(line(v, 4)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canCheckout").value(false))
                .andExpect(jsonPath("$.collection.totalPairs").value(4))
                .andExpect(jsonPath("$.collection.minimumPairs").value(10))
                .andExpect(jsonPath("$.collection.minimumMessage").value("The minimum order is 10 pairs. You can mix different socks to reach it."));
        quote(null, List.of(line(v, 10)))
                .andExpect(jsonPath("$.canCheckout").value(true))
                .andExpect(jsonPath("$.collection.minimumMessage").doesNotExist());
    }

    // ---- trusted customers ------------------------------------------------------------------

    @Test
    void anOwnerCanTrustACustomerWithASmallerMinimum() throws Exception {
        policy(10, 5, 50);
        Variant v = data.variant(20);
        String email = customer();
        String buyer = tokenForEmail(email, Role.CUSTOMER);
        checkout(buyer, List.of(line(v, 5))).andExpect(status().isBadRequest());

        UUID id = users.findByEmail(email).orElseThrow().getId();
        sendJson("PUT", "/api/admin/customers/" + id + "/trusted", tokenFor(Role.ADMIN), Map.of("trusted", true))
                .andExpect(status().isOk()).andExpect(jsonPath("$.trusted").value(true));
        checkout(buyer, List.of(line(v, 5))).andExpect(status().isCreated());
        assertThat(auditLog.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("USER", id)).extracting("action").contains("CUSTOMER_TRUST_CHANGED");
    }

    @Test
    void aCustomerWithEnoughPaidOrdersIsTrustedAutomatically() throws Exception {
        Variant v = data.variant(30);
        String buyer = tokenForEmail(customer(), Role.CUSTOMER);
        checkout(buyer, List.of(line(v, 10))).andExpect(status().isCreated());   // no minimum yet: the first order

        policy(10, 5, 1);
        checkout(buyer, List.of(line(v, 5))).andExpect(status().isCreated());
        checkout(tokenForEmail(customer(), Role.CUSTOMER), List.of(line(v, 5))).andExpect(status().isBadRequest());
    }

    // ---- the ladder -------------------------------------------------------------------------

    @Test
    void theLadderLowersThePricePerPairAndSaysHowFarTheNextStepIs() throws Exception {
        tier(20, "5.00");
        tier(30, "8.00");
        Variant v = data.variant(50);
        quote(null, List.of(line(v, 16)))
                .andExpect(jsonPath("$.lines[0].unitPrice").value(10.00))
                .andExpect(jsonPath("$.collection.nextTier.minPairs").value(20))
                .andExpect(jsonPath("$.collection.nextTier.pairsToGo").value(4))
                .andExpect(jsonPath("$.collection.nextTier.discountPct").value(5.00));

        JsonNode order = json(checkout(tokenForEmail(customer(), Role.CUSTOMER), List.of(line(v, 20))).andExpect(status().isCreated()));
        assertThat(order.get("items").get(0).get("unitPrice").decimalValue()).isEqualByComparingTo("9.50");
        assertThat(order.get("items").get(0).get("discountSource").asText()).isEqualTo("TIER");
        assertThat(order.get("total").decimalValue()).isEqualByComparingTo("190.00");
    }

    @Test
    void noStepOfTheLadderGoesBelowASocksOwnLimit() throws Exception {
        tier(10, "40.00");                                                  // the owner typed too much
        Variant v = data.variant(20);                                       // this sock allows at most 15%
        JsonNode order = json(checkout(tokenForEmail(customer(), Role.CUSTOMER), List.of(line(v, 10))).andExpect(status().isCreated()));
        assertThat(order.get("items").get(0).get("discountPct").decimalValue()).isEqualByComparingTo("15.00");
        var row = jdbc.queryForMap("select tier_discount_pct t, discount_source s, discount_capped c from order_item where order_id = ?",
                UUID.fromString(order.get("id").asText()));
        assertThat((java.math.BigDecimal) row.get("T")).isEqualByComparingTo("40.00");
        assertThat(row.get("S")).isEqualTo("TIER");
        assertThat(row.get("C")).isEqualTo(true);
    }

    @Test
    void theBetterOfTierAndNegotiatedOfferWins() throws Exception {
        tier(10, "5.00");
        Variant better = data.variant(20), worse = data.variant(20);
        String email = customer();
        String buyer = tokenForEmail(email, Role.CUSTOMER);
        User user = users.findByEmail(email).orElseThrow();
        NegotiationSession high = data.offer(user, better, "12.00", "12.00");
        NegotiationSession low = data.offer(user, worse, "3.00", "3.00");

        JsonNode order = json(checkout(buyer, List.of(line(better, 10, high.getId()), line(worse, 10, low.getId()))).andExpect(status().isCreated()));
        Map<String, JsonNode> bySku = new LinkedHashMap<>();
        order.get("items").forEach(i -> bySku.put(i.get("sku").asText(), i));
        assertThat(bySku.get(better.getSku()).get("discountPct").decimalValue()).isEqualByComparingTo("12.00");
        assertThat(bySku.get(better.getSku()).get("discountSource").asText()).isEqualTo("NEGOTIATED");
        assertThat(bySku.get(worse.getSku()).get("discountPct").decimalValue()).isEqualByComparingTo("5.00");
        assertThat(bySku.get(worse.getSku()).get("discountSource").asText()).isEqualTo("TIER");
    }

    // ---- who may change it ------------------------------------------------------------------

    @Test
    void onlyOwnersSeeOrChangePricing() throws Exception {
        for (Role role : List.of(Role.STAFF, Role.CUSTOMER)) {
            getJson("/api/admin/pricing/policy", tokenFor(role)).andExpect(status().isForbidden());
            getJson("/api/admin/pricing/tiers", tokenFor(role)).andExpect(status().isForbidden());
            sendJson("POST", "/api/admin/pricing/tiers", tokenFor(role), Map.of("minPairs", 10, "discountPct", "5")).andExpect(status().isForbidden());
        }
        getJson("/api/admin/pricing/policy", null).andExpect(status().isUnauthorized());
        assertThat(tiers.count()).isZero();
    }

    @Test
    void everyoneSeesTheMinimumAndTheLadderButNothingElse() throws Exception {
        policy(10, 5, 3);
        tier(20, "5.00");
        String raw = getJson("/api/pricing", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.minOrderPairs").value(10))
                .andExpect(jsonPath("$.tiers[0].minPairs").value(20))
                .andReturn().getResponse().getContentAsString();
        assertThat(raw).doesNotContain("trusted", "id");
    }

    @Test
    void badPricingIsRefusedWithAReason() throws Exception {
        String admin = tokenFor(Role.ADMIN);
        sendJson("PUT", "/api/admin/pricing/policy", admin, Map.of("minOrderPairs", 5, "trustedMinOrderPairs", 10, "trustedAfterOrders", 3))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("The minimum for trusted customers cannot be higher than the normal minimum."));
        sendJson("POST", "/api/admin/pricing/tiers", admin, Map.of("minPairs", 20, "discountPct", "95")).andExpect(status().isBadRequest());
        sendJson("POST", "/api/admin/pricing/tiers", admin, Map.of("minPairs", 0, "discountPct", "5")).andExpect(status().isBadRequest());
        tier(20, "5.00");
        sendJson("POST", "/api/admin/pricing/tiers", admin, Map.of("minPairs", 20, "discountPct", "6")).andExpect(status().isConflict());
    }

    @Test
    void stepsCanBeChangedAndRemovedAndEveryChangeIsAudited() throws Exception {
        String admin = tokenFor(Role.ADMIN);
        String id = tier(20, "5.00");
        sendJson("PUT", "/api/admin/pricing/tiers/" + id, admin, Map.of("minPairs", 25, "discountPct", "6.50"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.minPairs").value(25)).andExpect(jsonPath("$.discountPct").value(6.50));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/admin/pricing/tiers/" + id)
                .header("Authorization", admin)).andExpect(status().isNoContent());
        assertThat(auditLog.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("PRICE_TIER", UUID.fromString(id)))
                .extracting("action").containsExactlyInAnyOrder("PRICE_TIER_DELETED", "PRICE_TIER_UPDATED", "PRICE_TIER_CREATED");

        policy(10, 5, 3);
        assertThat(auditLog.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("SHOP_POLICY", PricingAdminService.POLICY_AUDIT_ID))
                .extracting("action").contains("PRICING_POLICY_UPDATED");
    }
}
