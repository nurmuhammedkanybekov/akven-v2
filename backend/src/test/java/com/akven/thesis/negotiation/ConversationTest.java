package com.akven.thesis.negotiation;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** A negotiation is a conversation: the assistant sees what was said, every turn is kept, the latest offer counts. */
class ConversationTest extends IntegrationTest {

    @MockBean private Negotiator assistant;
    @Autowired private OrderTestData data;
    @Autowired private NegotiationSessionRepository sessions;
    @Autowired private NegotiationTurnRepository turns;

    private static String email() { return "talker-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test"; }

    private JsonNode say(String token, Variant v, String message, int quantity, String sessionId, String language) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of("variantSku", v.getSku(), "message", message, "quantity", quantity));
        if (sessionId != null) body.put("sessionId", sessionId);
        if (language != null) body.put("language", language);
        return json(sendJson("POST", "/api/negotiate", token, body).andExpect(status().isOk()));
    }

    @Test
    void theSecondMessageContinuesTheConversationAndTheAssistantSeesTheFirst() throws Exception {
        when(assistant.propose(any()))
                .thenReturn(new Negotiator.Proposal(new BigDecimal("3"), "A little off: {pct}%, {price}.", "llm"))
                .thenReturn(new Negotiator.Proposal(new BigDecimal("6"), "For the family, {pct}%: {price}.", "llm"));
        Variant v = data.variant(50);
        String token = tokenForEmail(email(), Role.CUSTOMER);

        JsonNode first = say(token, v, "any discount?", 2, null, null);
        String id = first.get("sessionId").asText();
        JsonNode second = say(token, v, "we are a family of five", 10, id, null);

        assertThat(second.get("sessionId").asText()).isEqualTo(id);
        assertThat(second.get("validatedDiscountPct").decimalValue()).isEqualByComparingTo("6");
        ArgumentCaptor<NegotiationContext> seen = ArgumentCaptor.forClass(NegotiationContext.class);
        verify(assistant, atLeastOnce()).propose(seen.capture());
        NegotiationContext last = seen.getValue();
        assertThat(last.history()).hasSize(1);
        assertThat(last.history().get(0).customer()).isEqualTo("any discount?");
        assertThat(last.history().get(0).reply()).isEqualTo(first.get("reply").asText());
        assertThat(last.history().get(0).discountPct()).isEqualByComparingTo("3");
        assertThat(last.shopTerms()).anyMatch(t -> t.startsWith("Stock of this sock"));

        NegotiationSession s = sessions.findById(UUID.fromString(id)).orElseThrow();
        assertThat(s.getValidatedDiscountPct()).isEqualByComparingTo("6");
        assertThat(s.getQuantity()).isEqualTo(10);
        assertThat(s.getTranscript()).contains("any discount?").contains("family of five");
        List<NegotiationTurn> stored = turns.findBySessionIdOrderByPositionAsc(s.getId());
        assertThat(stored).extracting(NegotiationTurn::getPosition).containsExactly(0, 1);
        assertThat(stored).extracting(NegotiationTurn::getAssistant).containsOnly("llm");

        JsonNode detail = json(getJson("/api/admin/negotiations/" + id, tokenFor(Role.STAFF)).andExpect(status().isOk()));
        assertThat(detail.get("turns")).hasSize(2);
    }

    @Test
    void someoneElsesConversationCannotBeContinued() throws Exception {
        when(assistant.propose(any())).thenReturn(new Negotiator.Proposal(BigDecimal.ZERO, "Hello, {price}.", "rules"));
        Variant v = data.variant(5);
        String id = say(tokenForEmail(email(), Role.CUSTOMER), v, "hi", 1, null, null).get("sessionId").asText();
        sendJson("POST", "/api/negotiate", tokenForEmail(email(), Role.CUSTOMER),
                Map.of("variantSku", v.getSku(), "message", "hi", "sessionId", id)).andExpect(status().isNotFound());
    }

    @Test
    void anotherItemStartsANewConversation() throws Exception {
        when(assistant.propose(any())).thenReturn(new Negotiator.Proposal(BigDecimal.ZERO, "Hello, {price}.", "rules"));
        String token = tokenForEmail(email(), Role.CUSTOMER);
        String id = say(token, data.variant(5), "hi", 1, null, null).get("sessionId").asText();
        assertThat(say(token, data.variant(5), "hi", 1, id, null).get("sessionId").asText()).isNotEqualTo(id);
    }

    @Test
    void theShopAnswersInTheCustomersLanguageWhenItStepsIn() throws Exception {
        when(assistant.propose(any())).thenReturn(new Negotiator.Proposal(new BigDecimal("60"), "Take it all, {pct}%!", "llm"));
        Variant v = data.variant(5); // floor 15%
        String token = tokenForEmail(email(), Role.CUSTOMER);
        assertThat(say(token, v, "скидку 60%", 1, null, "ru").get("reply").asText()).startsWith("Это лучшее").contains("15%");
        assertThat(say(token, v, "60% арзандатып бериңиз", 1, null, "ky").get("reply").asText()).startsWith("Бул эң жакшы");
        ArgumentCaptor<NegotiationContext> seen = ArgumentCaptor.forClass(NegotiationContext.class);
        verify(assistant, atLeastOnce()).propose(seen.capture());
        assertThat(seen.getValue().language()).isEqualTo("ky");
        sendJson("POST", "/api/negotiate", token, Map.of("variantSku", v.getSku(), "message", "hi", "language", "de"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aZeroOfferNeverSaysZeroPercentOff() throws Exception {
        when(assistant.propose(any())).thenReturn(new Negotiator.Proposal(BigDecimal.ZERO, "Sure, {pct}% off!", "llm"));
        JsonNode reply = say(tokenForEmail(email(), Role.CUSTOMER), data.variant(5), "hi", 1, null, null);
        assertThat(reply.get("reply").asText()).doesNotContain("0%").startsWith("I cannot go below");
    }
}
