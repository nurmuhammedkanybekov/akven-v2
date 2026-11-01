package com.akven.thesis.wholesale;

import com.akven.thesis.audit.AuditLogRepository;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.ResultActions;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Wholesale requests: anyone may send one, the shop team reads and handles them, and the form cannot be used to flood the inbox. */
class WholesaleRequestTest extends IntegrationTest {

    @Autowired private WholesaleRequestRepository requests;
    @Autowired private AuditLogRepository auditLog;

    private Map<String, Object> request(String company, String contactKind, String contact) {
        Map<String, Object> m = new HashMap<>();
        m.put("kind", "WHOLESALE");
        m.put("company", company);
        m.put("city", "Osh");
        m.put("contactKind", contactKind);
        m.put("contact", contact);
        m.put("pairs", 240);
        m.put("mix", "Classic crew, navy: 120\nOimo, cream: 120");
        m.put("note", "Before the school year, please.");
        return m;
    }

    private ResultActions send(Map<String, Object> body, String address) throws Exception {
        return mockMvc.perform(post("/api/wholesale/requests").contentType("application/json")
                .content(objectMapper.writeValueAsString(body)).with(r -> { r.setRemoteAddr(address); return r; }));
    }

    private static String address() {
        return "10.1." + (int) (Math.random() * 250) + "." + (int) (Math.random() * 250);
    }

    @Test
    void aVisitorSendsARequestAndTheShopTeamHandlesIt() throws Exception {
        String company = "Ak-Jol Market " + UUID.randomUUID().toString().substring(0, 6);
        Map<String, Object> body = request("  " + company + "\u0007 ", "WHATSAPP", "+996 700 123 456");
        body.put("note", "Before the school year,\n\n\n\n please.");
        JsonNode received = json(send(body, address()).andExpect(status().isCreated()));
        assertThat(received.get("reference").asText()).matches("W-[0-9A-F]{8}");

        getJson("/api/admin/wholesale", null).andExpect(status().isUnauthorized());
        getJson("/api/admin/wholesale", tokenFor(Role.CUSTOMER)).andExpect(status().isForbidden());
        JsonNode inbox = json(getJson("/api/admin/wholesale?status=NEW", tokenFor(Role.STAFF)).andExpect(status().isOk()));
        assertThat(inbox.get("waiting").asLong()).isPositive();
        JsonNode mine = null;
        for (JsonNode line : inbox.get("requests")) if (line.get("reference").asText().equals(received.get("reference").asText())) mine = line;
        assertThat(mine).isNotNull();
        assertThat(mine.get("company").asText()).isEqualTo(company);
        assertThat(mine.get("note").asText()).isEqualTo("Before the school year,\n\n please.");
        assertThat(mine.get("accountEmail").isNull()).isTrue();

        String id = mine.get("id").asText();
        JsonNode handled = json(sendJson("PUT", "/api/admin/wholesale/" + id, tokenFor(Role.STAFF),
                Map.of("status", "ANSWERED", "staffNote", "Called back, sending the price list.")).andExpect(status().isOk()));
        assertThat(handled.get("status").asText()).isEqualTo("ANSWERED");
        assertThat(auditLog.findAll()).anyMatch(e -> e.getEntityId().equals(UUID.fromString(id)) && e.getAction().equals("WHOLESALE_ANSWERED"));

        // Once picked up, a request does not become new again.
        sendJson("PUT", "/api/admin/wholesale/" + id, tokenFor(Role.STAFF), Map.of("status", "NEW")).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/admin/wholesale/" + UUID.randomUUID(), tokenFor(Role.STAFF), Map.of("status", "CLOSED")).andExpect(status().isNotFound());
        sendJson("PUT", "/api/admin/wholesale/" + id, tokenFor(Role.CUSTOMER), Map.of("status", "CLOSED")).andExpect(status().isForbidden());
    }

    @Test
    void aSignedInCustomerIsRemembered() throws Exception {
        String email = "shop-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test";
        String token = tokenForEmail(email, Role.CUSTOMER);
        JsonNode received = json(mockMvc.perform(post("/api/wholesale/requests").contentType("application/json").header("Authorization", token)
                .content(objectMapper.writeValueAsString(request("Gifts LLC", "EMAIL", "buyer@example.kg")))
                .with(r -> { r.setRemoteAddr(address()); return r; })).andExpect(status().isCreated()));
        assertThat(requests.findAll()).anyMatch(r -> email.equals(r.getAccountEmail())
                && WholesaleService.reference(r.getId()).equals(received.get("reference").asText()));
    }

    @Test
    void badContactsAndBadFieldsAreRefused() throws Exception {
        String a = address();
        send(request("Shop", "WHATSAPP", "call me"), a).andExpect(status().isBadRequest());
        send(request("Shop", "EMAIL", "not-an-email"), a).andExpect(status().isBadRequest());
        send(request("Shop", "TELEGRAM", "@a b"), a).andExpect(status().isBadRequest());
        send(request("S", "PHONE", "+996 700 123 456"), a).andExpect(status().isBadRequest());
        Map<String, Object> many = request("Shop", "PHONE", "+996 700 123 456");
        many.put("pairs", 0);
        send(many, a).andExpect(status().isBadRequest());
        many.put("pairs", 100001);
        send(many, a).andExpect(status().isBadRequest());
        many.put("pairs", 50);
        many.put("note", "x".repeat(501));
        send(many, a).andExpect(status().isBadRequest());
        many.remove("note");
        many.put("kind", "FREE_SOCKS");
        send(many, a).andExpect(status().isBadRequest());
        // None of the refusals used up the visitor's hour.
        send(request("Shop " + UUID.randomUUID(), "TELEGRAM", "akven_shop"), a).andExpect(status().isCreated());
        assertThat(requests.findAll()).anyMatch(r -> r.getContact().equals("@akven_shop"));
    }

    @Test
    void aBotFillingTheTrapFieldIsAnsweredButNothingIsKept() throws Exception {
        long before = requests.count();
        Map<String, Object> body = request("Spam Inc", "EMAIL", "spam@example.com");
        body.put("website", "http://spam.example");
        send(body, address()).andExpect(status().isCreated());
        assertThat(requests.count()).isEqualTo(before);
    }

    @Test
    void oneAddressCanSendOnlyAFewRequestsAnHour() throws Exception {
        String a = address();
        for (int i = 0; i < 5; i++) send(request("Shop " + i, "PHONE", "+996 700 123 456"), a).andExpect(status().isCreated());
        send(request("Shop 6", "PHONE", "+996 700 123 456"), a).andExpect(status().isTooManyRequests());
        send(request("Another shop", "PHONE", "+996 700 123 456"), address()).andExpect(status().isCreated());
    }
}
