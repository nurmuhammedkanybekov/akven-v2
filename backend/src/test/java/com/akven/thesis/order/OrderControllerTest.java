package com.akven.thesis.order;

import com.akven.thesis.audit.AuditLogEntry;
import com.akven.thesis.audit.AuditLogRepository;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.catalog.VariantRepository;
import com.akven.thesis.negotiation.NegotiationSession;
import com.akven.thesis.payment.SimulatedWalletProvider;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.akven.thesis.user.User;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The money paths, end to end through the real security chain and database: what a customer pays is decided by
 * the server, stock never oversells, a payment that fails leaves no trace in stock, a retried request never charges
 * twice, and negotiated prices can only ever be the validated ones.
 */
class OrderControllerTest extends IntegrationTest {

    static final String OK = "sim_apple_abcdef123456";
    static final String DECLINED = "sim_apple_declined0000";
    static final String UNAVAILABLE = "sim_apple_unavailable00";

    @Autowired private OrderTestData data;
    @Autowired private OrderRepository orders;
    @Autowired private VariantRepository variants;
    @Autowired private AuditLogRepository auditLog;
    @Autowired private JdbcTemplate jdbc;
    @SpyBean private SimulatedWalletProvider wallet;

    // ---- helpers ----------------------------------------------------------------------------

    private static String email() { return "buyer-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test"; }
    private static String key() { return UUID.randomUUID().toString(); }

    private static Map<String, Object> line(String sku, int qty, UUID offer) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sku", sku);
        m.put("quantity", qty);
        if (offer != null) m.put("negotiationSessionId", offer.toString());
        return m;
    }

    private static Map<String, Object> body(List<Map<String, Object>> items, String token) {
        return Map.of("items", items,
                "fulfillment", Map.of("method", "PICKUP", "contactName", "Aida", "contactPhone", "+996 700 123 456"),
                "payment", Map.of("method", "APPLE_PAY", "token", token));
    }

    private static Map<String, Object> body(String sku, int qty) { return body(List.of(line(sku, qty, null)), OK); }

    private ResultActions checkout(String bearer, String idempotencyKey, Object payload) throws Exception {
        var request = post("/api/orders").contentType("application/json").content(objectMapper.writeValueAsString(payload));
        if (bearer != null) request.header("Authorization", bearer);
        if (idempotencyKey != null) request.header("Idempotency-Key", idempotencyKey);
        return mockMvc.perform(request);
    }

    private JsonNode paid(String bearer, Variant v, int qty) throws Exception {
        return json(checkout(bearer, key(), body(v.getSku(), qty)).andExpect(status().isCreated()));
    }

    private List<String> auditActions(String orderId) {
        return auditLog.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("ORDER", UUID.fromString(orderId)).stream()
                .map(AuditLogEntry::getAction).toList();
    }

    // ---- quote (public) ---------------------------------------------------------------------

    @Test
    void theQuoteIsPublicAndReportsCurrentPricesAndProblems() throws Exception {
        Variant ok = data.variant(5), soldOut = data.variant(0);
        postJson("/api/cart/quote", Map.of("items", List.of(line(ok.getSku(), 2, null), line(soldOut.getSku(), 1, null), line("NO-SUCH-SKU", 1, null))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lines[0].unitPrice").value(10.00))
                .andExpect(jsonPath("$.lines[0].lineTotal").value(20.00))
                .andExpect(jsonPath("$.lines[0].variantLabel").value("Navy, M"))
                .andExpect(jsonPath("$.lines[0].problem").value("NONE"))
                .andExpect(jsonPath("$.lines[1].problem").value("SOLD_OUT"))
                .andExpect(jsonPath("$.lines[2].problem").value("UNAVAILABLE"))
                .andExpect(jsonPath("$.canCheckout").value(false));
        postJson("/api/cart/quote", Map.of("items", List.of(line(ok.getSku(), 9, null))))
                .andExpect(jsonPath("$.lines[0].problem").value("NOT_ENOUGH_STOCK"))
                .andExpect(jsonPath("$.lines[0].note").value("Only 5 left."));
        // A quote exposes customer-facing data only.
        String raw = postJson("/api/cart/quote", Map.of("items", List.of(line(ok.getSku(), 1, null)))).andReturn().getResponse().getContentAsString();
        assertThat(raw).doesNotContain("costPrice", "marginFloorPct");
    }

    private ResultActions postJson(String url, Object payload) throws Exception {
        return mockMvc.perform(post(url).contentType("application/json").content(objectMapper.writeValueAsString(payload)));
    }

    // ---- the happy path ---------------------------------------------------------------------

    @Test
    void checkoutPaysSellsTheStockAndLeavesAReceipt() throws Exception {
        Variant v = data.variant(5);
        String me = tokenForEmail(email(), Role.CUSTOMER);

        JsonNode order = paid(me, v, 2);
        assertThat(order.get("status").asText()).isEqualTo("PAID");
        assertThat(order.get("total").decimalValue()).isEqualByComparingTo("20.00");
        assertThat(order.get("reference").asText()).matches("AV-[0-9A-F]{8}");
        assertThat(order.get("items").get(0).get("productName").asText()).startsWith("Order Test Sock");
        assertThat(order.get("items").get(0).get("variantLabel").asText()).isEqualTo("Navy, M");
        assertThat(order.get("payment").get("reference").asText()).startsWith("…").doesNotContain("sim_pay_");   // shortened
        assertThat(order.get("customerEmail").isNull()).isTrue();                                              // customers never see this field filled

        Variant after = data.reload(v);                       // 2 pairs left the shelf, nothing is still held
        assertThat(after.getStockQty()).isEqualTo(3);
        assertThat(after.getReservedQty()).isZero();

        String id = order.get("id").asText();
        getJson("/api/orders/" + id, me).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PAID"));
        assertThat(json(getJson("/api/orders", me))).hasSize(1);
        assertThat(auditActions(id)).containsExactly("ORDER_PAID", "ORDER_PLACED");
    }

    @Test
    void theClientCannotChooseAPrice() throws Exception {
        Variant v = data.variant(5);
        Map<String, Object> sneaky = new LinkedHashMap<>(line(v.getSku(), 1, null));
        sneaky.put("price", 0.01);
        sneaky.put("unitPrice", 0.01);
        sneaky.put("total", 0.01);
        Map<String, Object> payload = new LinkedHashMap<>(body(List.of(sneaky), OK));
        payload.put("total", 0.01);
        JsonNode order = json(checkout(tokenForEmail(email(), Role.CUSTOMER), key(), payload).andExpect(status().isCreated()));
        assertThat(order.get("total").decimalValue()).isEqualByComparingTo("10.00");
        assertThat(order.get("items").get(0).get("unitPrice").decimalValue()).isEqualByComparingTo("10.00");
    }

    @Test
    void theSameItemTwiceInOneCartIsOneLine() throws Exception {
        Variant v = data.variant(5);
        JsonNode order = json(checkout(tokenForEmail(email(), Role.CUSTOMER), key(), body(List.of(line(v.getSku(), 1, null), line(v.getSku(), 2, null)), OK))
                .andExpect(status().isCreated()));
        assertThat(order.get("items")).hasSize(1);
        assertThat(order.get("items").get(0).get("quantity").asInt()).isEqualTo(3);
    }

    // ---- idempotency ------------------------------------------------------------------------

    @Test
    void retryingWithTheSameKeyReturnsTheSameOrderAndSellsOnce() throws Exception {
        Variant v = data.variant(5);
        String me = tokenForEmail(email(), Role.CUSTOMER);
        String k = key();
        String first = json(checkout(me, k, body(v.getSku(), 1)).andExpect(status().isCreated())).get("id").asText();
        String second = json(checkout(me, k, body(v.getSku(), 1)).andExpect(status().isOk())).get("id").asText();
        assertThat(second).isEqualTo(first);
        assertThat(data.reload(v).getStockQty()).isEqualTo(4);                 // sold once, not twice

        String third = json(checkout(me, key(), body(v.getSku(), 1)).andExpect(status().isCreated())).get("id").asText();
        assertThat(third).isNotEqualTo(first);                                  // a new attempt is a new order
        assertThat(data.reload(v).getStockQty()).isEqualTo(3);
    }

    @Test
    void theSameKeyFromAnotherCustomerIsNotTheSameOrder() throws Exception {
        Variant v = data.variant(5);
        String k = key();
        String a = json(checkout(tokenForEmail(email(), Role.CUSTOMER), k, body(v.getSku(), 1)).andExpect(status().isCreated())).get("id").asText();
        String b = json(checkout(tokenForEmail(email(), Role.CUSTOMER), k, body(v.getSku(), 1)).andExpect(status().isCreated())).get("id").asText();
        assertThat(a).isNotEqualTo(b);
    }

    // ---- stock ------------------------------------------------------------------------------

    @Test
    void youCannotBuyMoreThanIsInStock() throws Exception {
        Variant v = data.variant(5);
        checkout(tokenForEmail(email(), Role.CUSTOMER), key(), body(v.getSku(), 6))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Only 5 left of " + v.getProduct().getName() + "."));
        Variant after = data.reload(v);
        assertThat(after.getStockQty()).isEqualTo(5);
        assertThat(after.getReservedQty()).isZero();
    }

    @Test
    void aSoldOutInactiveOrRetiredItemCannotBeBought() throws Exception {
        String me = tokenForEmail(email(), Role.CUSTOMER);
        Variant soldOut = data.variant(0);
        checkout(me, key(), body(soldOut.getSku(), 1)).andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.endsWith("is sold out.")));

        Variant hidden = data.variant(5);
        hidden.updateListing("M", "Navy", "#1F2A44", 1, hidden.getPrice(), 5, false);
        variants.saveAndFlush(hidden);
        checkout(me, key(), body(hidden.getSku(), 1)).andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.endsWith("is no longer available.")));

        Variant retired = data.variant(5);
        retired.getProduct().retire();
        jdbc.update("update product set is_active = false, retired_at = current_timestamp where id = ?", retired.getProduct().getId());
        checkout(me, key(), body(retired.getSku(), 1)).andExpect(status().isConflict());
        assertThat(data.reload(retired).getStockQty()).isEqualTo(5);
    }

    @Test
    void anUnknownItemIsRefusedAndNothingIsHeld() throws Exception {
        Variant real = data.variant(5);
        checkout(tokenForEmail(email(), Role.CUSTOMER), key(), body(List.of(line(real.getSku(), 1, null), line("GHOST-SKU", 1, null)), OK))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Some items are no longer in the shop: GHOST-SKU."));
        assertThat(data.reload(real).getReservedQty()).isZero();
    }

    // ---- validation -------------------------------------------------------------------------

    @Test
    void badRequestsAreRefusedWithClearMessages() throws Exception {
        Variant v = data.variant(5);
        String me = tokenForEmail(email(), Role.CUSTOMER);
        checkout(me, key(), body(v.getSku(), 0)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors").exists());
        checkout(me, key(), body(v.getSku(), 100)).andExpect(status().isBadRequest());
        checkout(me, key(), Map.of("items", List.of(), "fulfillment", Map.of("method", "PICKUP", "contactName", "A", "contactPhone", "+996700000000"),
                "payment", Map.of("method", "APPLE_PAY", "token", OK))).andExpect(status().isBadRequest());
        checkout(me, null, body(v.getSku(), 1)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value("Missing or invalid Idempotency-Key header."));
        checkout(me, "short", body(v.getSku(), 1)).andExpect(status().isBadRequest());
        Map<String, Object> delivery = Map.of("items", List.of(line(v.getSku(), 1, null)),
                "fulfillment", Map.of("method", "DELIVERY", "contactName", "A", "contactPhone", "+996700000000"),
                "payment", Map.of("method", "APPLE_PAY", "token", OK));
        checkout(me, key(), delivery).andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value("Enter a delivery address, or choose pickup."));
        Map<String, Object> badPhone = Map.of("items", List.of(line(v.getSku(), 1, null)),
                "fulfillment", Map.of("method", "PICKUP", "contactName", "A", "contactPhone", "call me maybe"),
                "payment", Map.of("method", "APPLE_PAY", "token", OK));
        checkout(me, key(), badPhone).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors['fulfillment.contactPhone']").exists());
        assertThat(data.reload(v).getStockQty()).isEqualTo(5);
    }

    @Test
    void checkoutAndOrderHistoryNeedALogin() throws Exception {
        Variant v = data.variant(5);
        checkout(null, key(), body(v.getSku(), 1)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/orders").header("Authorization", tokenForEmail(email(), Role.CUSTOMER))).andExpect(status().isForbidden());
    }

    // ---- payment ----------------------------------------------------------------------------

    @Test
    void aDeclinedPaymentCancelsTheOrderAndLeavesStockUntouched() throws Exception {
        Variant v = data.variant(5);
        String me = tokenForEmail(email(), Role.CUSTOMER);
        String k = key();
        JsonNode problem = json(checkout(me, k, body(List.of(line(v.getSku(), 2, null)), DECLINED))
                .andExpect(status().isPaymentRequired()).andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("declined"))));
        assertThat(problem.get("order").get("status").asText()).isEqualTo("CANCELLED");
        Variant after = data.reload(v);
        assertThat(after.getStockQty()).isEqualTo(5);
        assertThat(after.getReservedQty()).isZero();                            // the hold was released
        assertThat(auditActions(problem.get("order").get("id").asText())).contains("ORDER_PAYMENT_FAILED");

        // Pressing pay again with the same key does not sneak a second attempt through.
        checkout(me, k, body(List.of(line(v.getSku(), 2, null)), OK)).andExpect(status().isPaymentRequired());
        // A fresh checkout with a working wallet succeeds.
        paid(me, v, 2);
        assertThat(data.reload(v).getStockQty()).isEqualTo(3);
    }

    @Test
    void aPaymentServiceOutageIsA502AndNothingIsCharged() throws Exception {
        Variant v = data.variant(5);
        JsonNode problem = json(checkout(tokenForEmail(email(), Role.CUSTOMER), key(), body(List.of(line(v.getSku(), 1, null)), UNAVAILABLE))
                .andExpect(status().isBadGateway()));
        assertThat(problem.get("order").get("status").asText()).isEqualTo("CANCELLED");
        assertThat(data.reload(v).getReservedQty()).isZero();
    }

    @Test
    void cardNumbersAndMalformedTokensNeverReachThePaymentProviderOrCreateAnOrder() throws Exception {
        Variant v = data.variant(5);
        String me = tokenForEmail(email(), Role.CUSTOMER);
        long before = orders.count();
        for (String bad : List.of("4242 4242 4242 4242", "4242424242424242", "sim_apple_short", "sim_google_abcdef123456", "'; drop table customer_order; --")) {
            checkout(me, key(), body(List.of(line(v.getSku(), 1, null)), bad)).andExpect(status().isBadRequest());
        }
        // The card-number case names the rule; the order was rolled back, so neither stock nor the order table moved.
        checkout(me, key(), body(List.of(line(v.getSku(), 1, null)), "4242 4242 4242 4242"))
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("Card numbers are never accepted")));
        assertThat(orders.count()).isEqualTo(before);
        Variant after = data.reload(v);
        assertThat(after.getStockQty()).isEqualTo(5);
        assertThat(after.getReservedQty()).isZero();
    }

    // ---- negotiated prices ------------------------------------------------------------------

    @Test
    void aValidatedOfferSetsTheUnitPrice() throws Exception {
        Variant v = data.variant(5);
        String mail = email();
        NegotiationSession offer = data.offer(data.customer(mail), v, "10.00", "10.00");
        JsonNode order = json(checkout(tokenForEmail(mail, Role.CUSTOMER), key(), body(List.of(line(v.getSku(), 2, offer.getId())), OK)).andExpect(status().isCreated()));
        JsonNode item = order.get("items").get(0);
        assertThat(item.get("listPrice").decimalValue()).isEqualByComparingTo("10.00");
        assertThat(item.get("discountPct").decimalValue()).isEqualByComparingTo("10");
        assertThat(item.get("unitPrice").decimalValue()).isEqualByComparingTo("9.00");
        assertThat(order.get("total").decimalValue()).isEqualByComparingTo("18.00");
    }

    @Test
    void evenATamperedOfferCannotGoBelowTheMarginFloor() throws Exception {
        Variant v = data.variant(5, "10.00", "15.00");                          // the most it may ever be discounted is 15%
        String mail = email();
        NegotiationSession forged = data.offer(data.customer(mail), v, "50.00", "50.00");   // a row that claims 50% was validated
        JsonNode order = json(checkout(tokenForEmail(mail, Role.CUSTOMER), key(), body(List.of(line(v.getSku(), 1, forged.getId())), OK)).andExpect(status().isCreated()));
        assertThat(order.get("items").get(0).get("discountPct").decimalValue()).isEqualByComparingTo("15");
        assertThat(order.get("items").get(0).get("unitPrice").decimalValue()).isEqualByComparingTo("8.50");
    }

    @Test
    void anOfferBelongsToOneCustomerOneItemAndOneOrder() throws Exception {
        Variant v = data.variant(9), other = data.variant(9);
        String mail = email();
        User me = data.customer(mail);
        String token = tokenForEmail(mail, Role.CUSTOMER);
        NegotiationSession offer = data.offer(me, v, "10.00", "10.00");

        // someone else's offer
        checkout(tokenForEmail(email(), Role.CUSTOMER), key(), body(List.of(line(v.getSku(), 1, offer.getId())), OK))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value("That offer is not for this item."));
        // a different item
        checkout(token, key(), body(List.of(line(other.getSku(), 1, offer.getId())), OK))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value("That offer is not for this item."));
        // an offer that does not exist
        checkout(token, key(), body(List.of(line(v.getSku(), 1, UUID.randomUUID())), OK))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value("That offer no longer exists."));
        // the real use works once...
        String orderId = json(checkout(token, key(), body(List.of(line(v.getSku(), 1, offer.getId())), OK)).andExpect(status().isCreated())).get("id").asText();
        // ...and not twice
        checkout(token, key(), body(List.of(line(v.getSku(), 1, offer.getId())), OK))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value("That offer has already been used."));
        // cancelling the order gives the offer back
        mockMvc.perform(post("/api/orders/" + orderId + "/cancel").header("Authorization", token)).andExpect(status().isOk());
        checkout(token, key(), body(List.of(line(v.getSku(), 1, offer.getId())), OK)).andExpect(status().isCreated());
    }

    @Test
    void anOldOfferHasExpired() throws Exception {
        Variant v = data.variant(5);
        String mail = email();
        NegotiationSession offer = data.offer(data.customer(mail), v, "10.00", "10.00");
        jdbc.update("update negotiation_session set created_at = dateadd('DAY', -3, created_at) where id = ?", offer.getId());
        checkout(tokenForEmail(mail, Role.CUSTOMER), key(), body(List.of(line(v.getSku(), 1, offer.getId())), OK))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value("That offer has expired. Ask for a new price."));
    }

    @Test
    void theQuoteShowsTheNegotiatedPriceOnlyToItsOwner() throws Exception {
        Variant v = data.variant(5);
        String mail = email();
        NegotiationSession offer = data.offer(data.customer(mail), v, "10.00", "10.00");
        Map<String, Object> payload = Map.of("items", List.of(line(v.getSku(), 1, offer.getId())));
        mockMvc.perform(post("/api/cart/quote").contentType("application/json").content(objectMapper.writeValueAsString(payload))
                        .header("Authorization", tokenForEmail(mail, Role.CUSTOMER)))
                .andExpect(jsonPath("$.lines[0].unitPrice").value(9.00)).andExpect(jsonPath("$.lines[0].discountPct").value(10));
        postJson("/api/cart/quote", payload)                                     // anonymous: listed price, and a reason
                .andExpect(jsonPath("$.lines[0].unitPrice").value(10.00))
                .andExpect(jsonPath("$.lines[0].note").value("Sign in to use your negotiated price."));
    }

    // ---- ownership, cancel, fulfil ----------------------------------------------------------

    @Test
    void anotherCustomersOrderLooksLikeItDoesNotExist() throws Exception {
        Variant v = data.variant(5);
        String id = paid(tokenForEmail(email(), Role.CUSTOMER), v, 1).get("id").asText();
        String stranger = tokenForEmail(email(), Role.CUSTOMER);
        getJson("/api/orders/" + id, stranger).andExpect(status().isNotFound());
        mockMvc.perform(post("/api/orders/" + id + "/cancel").header("Authorization", stranger)).andExpect(status().isNotFound());
    }

    @Test
    void cancellingAPaidOrderRefundsAndPutsTheStockBack() throws Exception {
        Variant v = data.variant(5);
        String me = tokenForEmail(email(), Role.CUSTOMER);
        JsonNode order = paid(me, v, 2);
        assertThat(data.reload(v).getStockQty()).isEqualTo(3);

        mockMvc.perform(post("/api/orders/" + order.get("id").asText() + "/cancel").header("Authorization", me))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        Variant after = data.reload(v);
        assertThat(after.getStockQty()).isEqualTo(5);
        assertThat(after.getReservedQty()).isZero();
        verify(wallet).refund(any(), eq(new BigDecimal("20.00")));
        assertThat(auditActions(order.get("id").asText())).contains("ORDER_CANCELLED");

        mockMvc.perform(post("/api/orders/" + order.get("id").asText() + "/cancel").header("Authorization", me))
                .andExpect(status().isConflict());                              // cancelling twice is refused, stock stays correct
        assertThat(data.reload(v).getStockQty()).isEqualTo(5);
    }

    @Test
    void theShopTeamFulfilsOrdersAndAFulfilledOrderCanNoLongerBeCancelled() throws Exception {
        Variant v = data.variant(5);
        String me = tokenForEmail(email(), Role.CUSTOMER);
        String staff = tokenFor(Role.STAFF);
        String id = paid(me, v, 1).get("id").asText();

        getJson("/api/admin/orders?status=PAID&pageSize=100", staff)
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[?(@.id=='" + id + "')].customerEmail").isNotEmpty());
        mockMvc.perform(post("/api/admin/orders/" + id + "/fulfil").header("Authorization", staff))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("FULFILLED")).andExpect(jsonPath("$.fulfilledAt").exists());
        mockMvc.perform(post("/api/admin/orders/" + id + "/fulfil").header("Authorization", staff)).andExpect(status().isConflict());
        mockMvc.perform(post("/api/orders/" + id + "/cancel").header("Authorization", me)).andExpect(status().isConflict());
        mockMvc.perform(post("/api/admin/orders/" + id + "/cancel").header("Authorization", staff)).andExpect(status().isConflict());
        assertThat(data.reload(v).getStockQty()).isEqualTo(4);                  // a fulfilled sale stays sold
        assertThat(auditActions(id)).contains("ORDER_FULFILLED");
    }

    @Test
    void staffCanCancelAnyPaidOrderAndCustomersCannotUseTheAdminEndpoints() throws Exception {
        Variant v = data.variant(5);
        String me = tokenForEmail(email(), Role.CUSTOMER);
        String id = paid(me, v, 1).get("id").asText();
        mockMvc.perform(post("/api/admin/orders/" + id + "/cancel").header("Authorization", me)).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/orders/" + id + "/fulfil").header("Authorization", me)).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/orders/" + id + "/cancel").header("Authorization", tokenFor(Role.STAFF)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        assertThat(data.reload(v).getStockQty()).isEqualTo(5);
    }

    @Test
    void theStatusMachineRefusesEveryShortcut() {
        User u = new User("m@akven.test", "x", Role.CUSTOMER);
        Order o = new Order(u, null);
        org.junit.jupiter.api.Assertions.assertThrows(com.akven.thesis.common.ConflictException.class, o::fulfil);          // pending cannot be fulfilled
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> o.markPaid("APPLE_PAY", " "));   // no reference, no payment
        o.markPaid("APPLE_PAY", "sim_pay_x");
        org.junit.jupiter.api.Assertions.assertThrows(com.akven.thesis.common.ConflictException.class, () -> o.markPaid("APPLE_PAY", "sim_pay_y"));
        o.fulfil();
        org.junit.jupiter.api.Assertions.assertThrows(com.akven.thesis.common.ConflictException.class, o::cancel);
    }
}
