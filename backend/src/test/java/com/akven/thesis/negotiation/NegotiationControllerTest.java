package com.akven.thesis.negotiation;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The chat end to end: an assistant that over-offers is capped at the margin floor, and the evidence is stored. */
class NegotiationControllerTest extends IntegrationTest {

    @Autowired private OrderTestData data;
    @Autowired private NegotiationSessionRepository sessions;

    private static String email() { return "haggler-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test"; }

    private JsonNode chat(String token, Variant v, String message, Integer quantity) throws Exception {
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("variantSku", v.getSku());
        body.put("message", message);
        if (quantity != null) body.put("quantity", quantity);
        return json(sendJson("POST", "/api/negotiate", token, body).andExpect(status().isOk()));
    }

    @Test
    void anOverAskIsCappedAtTheFloorAndBothNumbersAreStored() throws Exception {
        Variant v = data.variant(5); // price 10.00, floor 15%
        String token = tokenForEmail(email(), Role.CUSTOMER);

        JsonNode reply = chat(token, v, "Please give me 40% off", 1);

        assertThat(reply.get("validatedDiscountPct").decimalValue()).isEqualByComparingTo("15");
        assertThat(reply.get("offerPrice").decimalValue()).isEqualByComparingTo("8.50");
        assertThat(reply.get("reply").asText()).contains("15%").contains("$8.50").doesNotContain("40");
        assertThat(reply.has("proposedDiscountPct")).as("customers never see the raw proposal by default").isFalse();

        NegotiationSession stored = sessions.findById(UUID.fromString(reply.get("sessionId").asText())).orElseThrow();
        assertThat(stored.getProposedDiscountPct()).isEqualByComparingTo("40");
        assertThat(stored.getValidatedDiscountPct()).isEqualByComparingTo("15");
        assertThat(stored.getValidatedDiscountPct()).isLessThanOrEqualTo(stored.getProposedDiscountPct());
        assertThat(stored.getValidatedDiscountPct()).isLessThanOrEqualTo(v.getMarginFloorPct());
    }

    @Test
    void aReasonableAskIsGrantedInFull() throws Exception {
        Variant v = data.variant(5);
        JsonNode reply = chat(tokenForEmail(email(), Role.CUSTOMER), v, "could you do 10%?", 1);
        assertThat(reply.get("validatedDiscountPct").decimalValue()).isEqualByComparingTo("10");
        assertThat(reply.get("offerPrice").decimalValue()).isEqualByComparingTo("9.00");
    }

    @Test
    void aGreetingGetsNoDiscountButAFriendlyReply() throws Exception {
        JsonNode reply = chat(tokenForEmail(email(), Role.CUSTOMER), data.variant(5), "hi", null);
        assertThat(reply.get("validatedDiscountPct").decimalValue()).isEqualByComparingTo("0");
        assertThat(reply.get("reply").asText()).contains("$10.00");
    }

    @Test
    void theResponseNeverContainsCostOrFloor() throws Exception {
        Variant v = data.variant(5);
        String text = sendJson("POST", "/api/negotiate", tokenForEmail(email(), Role.CUSTOMER),
                Map.of("variantSku", v.getSku(), "message", "80%")).andReturn().getResponse().getContentAsString();
        assertThat(text).doesNotContainIgnoringCase("cost").doesNotContainIgnoringCase("floor").doesNotContainIgnoringCase("margin");
    }

    @Test
    void anOfferCanBeUsedInTheCartAndStaysCapped() throws Exception {
        Variant v = data.variant(5);
        String token = tokenForEmail(email(), Role.CUSTOMER);
        JsonNode reply = chat(token, v, "70% or nothing", 1);
        JsonNode quote = json(sendJson("POST", "/api/cart/quote", token, Map.of("items", java.util.List.of(
                Map.of("sku", v.getSku(), "quantity", 1, "negotiationSessionId", reply.get("sessionId").asText()))))
                .andExpect(status().isOk()));
        assertThat(quote.toString()).contains("8.5");
    }

    @Test
    void anOfferForSeveralPairsDoesNotApplyToASinglePair() throws Exception {
        Variant v = data.variant(20);
        String token = tokenForEmail(email(), Role.CUSTOMER);
        JsonNode reply = chat(token, v, "I want a bundle, best price", 5);
        String id = reply.get("sessionId").asText();
        assertThat(reply.get("validatedDiscountPct").decimalValue()).isGreaterThan(BigDecimal.ZERO);

        JsonNode one = json(sendJson("POST", "/api/cart/quote", token, Map.of("items", java.util.List.of(
                Map.of("sku", v.getSku(), "quantity", 1, "negotiationSessionId", id)))).andExpect(status().isOk()));
        assertThat(one.get("lines").get(0).get("discountPct").decimalValue()).isEqualByComparingTo("0");
        assertThat(one.get("lines").get(0).get("note").asText()).contains("5 pairs or more");

        JsonNode five = json(sendJson("POST", "/api/cart/quote", token, Map.of("items", java.util.List.of(
                Map.of("sku", v.getSku(), "quantity", 5, "negotiationSessionId", id)))).andExpect(status().isOk()));
        assertThat(five.get("lines").get(0).get("discountPct").decimalValue()).isGreaterThan(BigDecimal.ZERO);
    }

    @Test
    void anonymousIsRefused() throws Exception {
        sendJson("POST", "/api/negotiate", null, Map.of("variantSku", "X", "message", "hi")).andExpect(status().isUnauthorized());
    }

    @Test
    void badInputIsRejected() throws Exception {
        String token = tokenForEmail(email(), Role.CUSTOMER);
        Variant v = data.variant(5);
        sendJson("POST", "/api/negotiate", token, Map.of("variantSku", v.getSku(), "message", " ")).andExpect(status().isBadRequest());
        sendJson("POST", "/api/negotiate", token, Map.of("variantSku", v.getSku(), "message", "x".repeat(501))).andExpect(status().isBadRequest());
        sendJson("POST", "/api/negotiate", token, Map.of("variantSku", v.getSku(), "message", "hi", "quantity", 0)).andExpect(status().isBadRequest());
        sendJson("POST", "/api/negotiate", token, Map.of("variantSku", "NO-SUCH-SKU", "message", "hi")).andExpect(status().isNotFound());
    }

    @Test
    void tooManyMessagesAreRefusedWith429() throws Exception {
        Variant v = data.variant(5);
        String token = tokenForEmail(email(), Role.CUSTOMER);
        for (int i = 0; i < 20; i++) chat(token, v, "hi", null);
        sendJson("POST", "/api/negotiate", token, Map.of("variantSku", v.getSku(), "message", "hi")).andExpect(status().isTooManyRequests());
    }

    @Test
    void theShopTeamSeesBothNumbersAndCustomersCannotReadTheList() throws Exception {
        Variant v = data.variant(5);
        String who = email();
        JsonNode reply = chat(tokenForEmail(who, Role.CUSTOMER), v, "give me 50%", 1);
        String id = reply.get("sessionId").asText();

        JsonNode one = json(getJson("/api/admin/negotiations/" + id, tokenFor(Role.STAFF)).andExpect(status().isOk()));
        assertThat(one.get("proposedDiscountPct").decimalValue()).isEqualByComparingTo("50");
        assertThat(one.get("validatedDiscountPct").decimalValue()).isEqualByComparingTo("15");
        assertThat(one.get("clamped").asBoolean()).isTrue();
        assertThat(one.get("customerEmail").asText()).isEqualTo(who);
        assertThat(one.get("transcript").asText()).contains("give me 50%");
        assertThat(one.toString()).doesNotContainIgnoringCase("marginFloor").doesNotContainIgnoringCase("costPrice");

        JsonNode list = json(getJson("/api/admin/negotiations?pageSize=5", tokenFor(Role.ADMIN)).andExpect(status().isOk()));
        assertThat(list.get("items").size()).isBetween(1, 5);

        getJson("/api/admin/negotiations", tokenFor(Role.CUSTOMER)).andExpect(status().isForbidden());
        getJson("/api/admin/negotiations", null).andExpect(status().isUnauthorized());
        getJson("/api/admin/negotiations/" + UUID.randomUUID(), tokenFor(Role.STAFF)).andExpect(status().isNotFound());
    }

    @Test
    void theDatabaseItselfRefusesAValidatedDiscountAboveTheProposal() {
        Variant v = data.variant(5);
        var customer = data.customer(email());
        NegotiationSession bad = new NegotiationSession(customer, v);
        bad.recordOutcome("t", new BigDecimal("5"), new BigDecimal("9"));
        org.junit.jupiter.api.Assertions.assertThrows(Exception.class, () -> sessions.saveAndFlush(bad));
    }
}
