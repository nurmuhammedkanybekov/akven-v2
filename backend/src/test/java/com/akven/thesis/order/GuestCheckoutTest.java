package com.akven.thesis.order;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.notify.EmailKind;
import com.akven.thesis.notify.OutboundEmail;
import com.akven.thesis.notify.OutboundEmailRepository;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.ResultActions;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Checkout without an account: the email takes the account's place, and a private link opens the order. */
class GuestCheckoutTest extends IntegrationTest {

    @Autowired private OrderTestData data;
    @Autowired private OutboundEmailRepository emails;

    private ResultActions buy(String bearer, String key, Variant v, String email, String remoteAddr) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of(
                "items", List.of(Map.of("sku", v.getSku(), "quantity", 2)),
                "fulfillment", Map.of("method", "PICKUP", "contactName", "Aida", "contactPhone", "+996 700 123 456"),
                "payment", Map.of("method", "GOOGLE_PAY", "token", "sim_google_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12))));
        if (email != null) body.put("email", email);
        var request = post("/api/orders").contentType("application/json").content(objectMapper.writeValueAsString(body))
                .header("Idempotency-Key", key).with(r -> { r.setRemoteAddr(remoteAddr); return r; });
        if (bearer != null) request.header("Authorization", bearer);
        return mockMvc.perform(request);
    }

    private static String key() {
        return UUID.randomUUID().toString();
    }

    private static String address() {
        return "10.9." + (int) (Math.random() * 250) + "." + (int) (Math.random() * 250);
    }

    private ResultActions open(String id, String token) throws Exception {
        var r = get("/api/orders/" + id);
        if (token != null) r.header("X-Order-Token", token);
        return mockMvc.perform(r);
    }

    @Test
    void aGuestPaysWithAnEmailAndOpensTheOrderWithItsPrivateLink() throws Exception {
        String ip = address();
        buy(null, key(), data.variant(10), null, ip).andExpect(status().isBadRequest());                 // no email: refused, nothing held
        buy(null, key(), data.variant(10), "not-an-email", ip).andExpect(status().isBadRequest());

        String k = key();
        JsonNode order = json(buy(null, k, data.variant(10), "Aida.Guest@Example.com", ip).andExpect(status().isCreated()));
        String id = order.get("id").asText();
        String token = order.get("accessToken").asText();
        assertThat(order.get("guest").asBoolean()).isTrue();
        assertThat(token).hasSizeGreaterThan(30);
        assertThat(order.at("/pickup/code").asText()).hasSize(6);

        // the link opens it; nothing else does
        JsonNode seen = json(open(id, token).andExpect(status().isOk()));
        assertThat(seen.get("reference").asText()).isEqualTo(order.get("reference").asText());
        assertThat(seen.get("accessToken").isNull()).isTrue();                                             // sent once, at checkout
        open(id, null).andExpect(status().isNotFound());
        open(id, token.substring(1) + "A").andExpect(status().isNotFound());
        open(id, "x".repeat(500)).andExpect(status().isNotFound());
        getJson("/api/orders/" + id, tokenForEmail("someone-" + UUID.randomUUID().toString().substring(0, 6) + "@akven.test", Role.CUSTOMER))
                .andExpect(status().isNotFound());
        // a token opens only its own order
        JsonNode other = json(buy(null, key(), data.variant(10), "other@example.com", ip).andExpect(status().isCreated()));
        open(other.get("id").asText(), token).andExpect(status().isNotFound());

        // a double click or a retry returns the same order and the same link
        JsonNode again = json(buy(null, k, data.variant(10), "aida.guest@example.com", ip).andExpect(status().isOk()));
        assertThat(again.get("id").asText()).isEqualTo(id);
        assertThat(again.get("accessToken").asText()).isEqualTo(token);

        // the confirmation goes to the guest, with the link and its key after the "#"
        OutboundEmail confirmation = emails.findByOrderIdOrderByCreatedAtAsc(UUID.fromString(id)).get(0);
        assertThat(confirmation.getTo()).isEqualTo("aida.guest@example.com");
        assertThat(confirmation.getBody()).contains("/orders/" + id + "#t=" + token).contains("without an account");

        // the staff see the guest's email on the order
        JsonNode admin = json(getJson("/api/admin/orders/" + id, tokenFor(Role.STAFF)).andExpect(status().isOk()));
        assertThat(admin.get("customerEmail").asText()).isEqualTo("aida.guest@example.com");
        assertThat(admin.get("guest").asBoolean()).isTrue();
    }

    @Test
    void theGuestCancelsWithTheLinkAndTheMoneyGoesBack() throws Exception {
        Variant v = data.variant(5);
        JsonNode order = json(buy(null, key(), v, "cancel.guest@example.com", address()).andExpect(status().isCreated()));
        String id = order.get("id").asText();
        mockMvc.perform(post("/api/orders/" + id + "/cancel")).andExpect(status().isNotFound());
        JsonNode cancelled = json(mockMvc.perform(post("/api/orders/" + id + "/cancel").header("X-Order-Token", order.get("accessToken").asText()))
                .andExpect(status().isOk()));
        assertThat(cancelled.get("status").asText()).isEqualTo("CANCELLED");
        assertThat(emails.findByOrderIdOrderByCreatedAtAsc(UUID.fromString(id))).extracting(OutboundEmail::getKind)
                .containsExactly(EmailKind.ORDER_CONFIRMED, EmailKind.ORDER_CANCELLED);
        // the guest's actions are in the audit log, without an account
        JsonNode log = json(getJson("/api/admin/audit?size=20", tokenFor(Role.SUPER_ADMIN)).andExpect(status().isOk()));
        boolean guestCancel = false;
        for (JsonNode e : log.get("items")) {
            if (e.get("action").asText().equals("ORDER_CANCELLED") && e.get("entityId").asText().equals(id)) guestCancel = e.get("actor").asText().equals("guest");
        }
        assertThat(guestCancel).isTrue();
    }

    @Test
    void aSignedInCustomerStillOrdersAsThemselvesAndNegotiatedOffersNeedAnAccount() throws Exception {
        String email = "acct-" + UUID.randomUUID().toString().substring(0, 6) + "@akven.test";
        JsonNode order = json(buy(tokenForEmail(email, Role.CUSTOMER), key(), data.variant(10), "ignored@example.com", address()).andExpect(status().isCreated()));
        assertThat(order.get("guest").asBoolean()).isFalse();
        assertThat(order.get("accessToken").isNull()).isTrue();
        assertThat(emails.findByOrderIdOrderByCreatedAtAsc(UUID.fromString(order.get("id").asText())).get(0).getTo()).isEqualTo(email);

        Map<String, Object> body = Map.of("items", List.of(Map.of("sku", data.variant(10).getSku(), "quantity", 2, "negotiationSessionId", UUID.randomUUID().toString())),
                "fulfillment", Map.of("method", "PICKUP", "contactName", "Aida", "contactPhone", "+996 700 123 456"),
                "payment", Map.of("method", "GOOGLE_PAY", "token", "sim_google_abcdef123456"), "email", "guest@example.com");
        JsonNode refused = json(mockMvc.perform(post("/api/orders").contentType("application/json").content(objectMapper.writeValueAsString(body))
                .header("Idempotency-Key", key())).andExpect(status().isBadRequest()));
        assertThat(refused.get("code").asText()).isEqualTo("OFFER_SIGN_IN");
        // and the order list stays an account's thing
        mockMvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
    }

    @Test
    void aLostLinkIsSentAgainOnlyToTheOrdersOwnEmailAndTheAnswerNeverTells() throws Exception {
        JsonNode order = json(buy(null, key(), data.variant(10), "lost.link@example.com", address()).andExpect(status().isCreated()));
        String id = order.get("id").asText();
        String ip = address();
        for (Map<String, String> ask : List.of(
                Map.of("email", "LOST.link@example.com", "reference", order.get("reference").asText().toLowerCase()),   // matches
                Map.of("email", "lost.link@example.com", "reference", "AV-00000000"),                                    // wrong order
                Map.of("email", "stranger@example.com", "reference", order.get("reference").asText()))) {                // wrong email
            mockMvc.perform(post("/api/orders/find").contentType("application/json").content(objectMapper.writeValueAsString(ask))
                    .with(r -> { r.setRemoteAddr(ip); return r; })).andExpect(status().isAccepted());
        }
        List<OutboundEmail> links = emails.findByOrderIdOrderByCreatedAtAsc(UUID.fromString(id)).stream().filter(e -> e.getKind() == EmailKind.ORDER_LINK).toList();
        assertThat(links).hasSize(1);
        assertThat(links.get(0).getTo()).isEqualTo("lost.link@example.com");
        assertThat(links.get(0).getBody()).contains("#t=" + order.get("accessToken").asText());

        // a few tries an hour, then the address waits
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/orders/find").contentType("application/json").content("{\"email\":\"a@example.com\",\"reference\":\"AV-11111111\"}")
                    .with(r -> { r.setRemoteAddr(ip); return r; })).andExpect(status().isAccepted());
        }
        mockMvc.perform(post("/api/orders/find").contentType("application/json").content("{\"email\":\"a@example.com\",\"reference\":\"AV-11111111\"}")
                .with(r -> { r.setRemoteAddr(ip); return r; })).andExpect(status().isTooManyRequests());
    }
}
