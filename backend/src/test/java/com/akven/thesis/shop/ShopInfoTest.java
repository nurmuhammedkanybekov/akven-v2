package com.akven.thesis.shop;

import com.akven.thesis.audit.AuditLogRepository;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contacts and the stall: everyone sees them, only owners change them, links are built by the server, and a pickup
 * order is handed over only to someone who knows both its code and the end of the contact phone number.
 */
class ShopInfoTest extends IntegrationTest {

    @Autowired private OrderTestData data;
    @Autowired private AuditLogRepository auditLog;
    @Autowired private JdbcTemplate jdbc;

    @AfterEach
    void clearShopInfo() {
        jdbc.update("update customer_order set pickup_point_id = null");
        jdbc.update("delete from pickup_point");
        jdbc.update("delete from shop_contact");
    }

    private ResultActions contact(String token, String kind, String value) throws Exception {
        return sendJson("POST", "/api/admin/shop/contacts", token, Map.of("kind", kind, "value", value));
    }

    private String dordoi(boolean active) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>(Map.of("name", "AK&VEN at Dordoi", "market", "Dordoi Bazaar", "section", "Dordoi-Junhai",
                "passage", "8", "container", "70-E", "hours", "Tue–Sun 7:00–16:00"));
        body.put("active", active);
        return json(sendJson("POST", "/api/admin/shop/pickup-points", tokenFor(Role.ADMIN), body).andExpect(status().isCreated())).get("id").asText();
    }

    // ---- contacts ---------------------------------------------------------------------------

    @Test
    void contactsAreTidiedAndLinkedByTheServer() throws Exception {
        String admin = tokenFor(Role.ADMIN);
        contact(admin, "INSTAGRAM", "@akven.socks").andExpect(status().isCreated())
                .andExpect(jsonPath("$.value").value("akven.socks"))
                .andExpect(jsonPath("$.url").value("https://instagram.com/akven.socks"));
        contact(admin, "TELEGRAM", "nurmss4").andExpect(jsonPath("$.url").value("https://t.me/nurmss4"));
        contact(admin, "WHATSAPP", "+996 (700) 123-456").andExpect(status().isCreated())
                .andExpect(jsonPath("$.value").value("+996700123456"))
                .andExpect(jsonPath("$.url").value("https://wa.me/996700123456"));
        contact(admin, "EMAIL", "shop@akven.kg").andExpect(jsonPath("$.url").value("mailto:shop@akven.kg"));
        contact(admin, "PHONE", "+996700123456").andExpect(jsonPath("$.url").value("tel:+996700123456"));
    }

    @Test
    void wrongContactsAreRefusedWithAHint() throws Exception {
        String admin = tokenFor(Role.ADMIN);
        contact(admin, "TELEGRAM", "ab").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Enter a Telegram username such as nurmss4."));
        contact(admin, "WHATSAPP", "0700123456").andExpect(status().isBadRequest());
        contact(admin, "EMAIL", "not-an-email").andExpect(status().isBadRequest());
        contact(admin, "INSTAGRAM", "https://evil.example/x").andExpect(status().isBadRequest());
    }

    @Test
    void everyoneSeesActiveContactsOnly() throws Exception {
        String admin = tokenFor(Role.ADMIN);
        contact(admin, "INSTAGRAM", "akven.socks").andExpect(status().isCreated());
        String hidden = json(contact(admin, "TELEGRAM", "nurmss4")).get("id").asText();
        sendJson("PUT", "/api/admin/shop/contacts/" + hidden, admin, Map.of("kind", "TELEGRAM", "value", "nurmss4", "active", false))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));

        JsonNode info = json(getJson("/api/shop/info", null).andExpect(status().isOk()));
        assertThat(info.get("contacts")).hasSize(1);
        assertThat(info.get("contacts").get(0).get("kind").asText()).isEqualTo("INSTAGRAM");
        assertThat(json(getJson("/api/admin/shop/contacts", admin))).hasSize(2);
    }

    @Test
    void onlyOwnersChangeContactsAndThePickupPoint() throws Exception {
        for (Role role : List.of(Role.STAFF, Role.CUSTOMER)) {
            contact(tokenFor(role), "INSTAGRAM", "akven.socks").andExpect(status().isForbidden());
            getJson("/api/admin/shop/pickup-points", tokenFor(role)).andExpect(status().isForbidden());
        }
        getJson("/api/admin/shop/contacts", null).andExpect(status().isUnauthorized());
    }

    @Test
    void contactChangesAreAudited() throws Exception {
        String admin = tokenFor(Role.ADMIN);
        String id = json(contact(admin, "INSTAGRAM", "akven.socks")).get("id").asText();
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/admin/shop/contacts/" + id)
                .header("Authorization", admin)).andExpect(status().isNoContent());
        assertThat(auditLog.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("SHOP_CONTACT", UUID.fromString(id)))
                .extracting("action").containsExactlyInAnyOrder("CONTACT_CREATED", "CONTACT_DELETED");
    }

    // ---- the stall and pickup codes ---------------------------------------------------------

    @Test
    void thePickupPointIsPublicAndEditable() throws Exception {
        String id = dordoi(true);
        getJson("/api/shop/info", null)
                .andExpect(jsonPath("$.pickupPoints[0].container").value("70-E"))
                .andExpect(jsonPath("$.pickupPoints[0].passage").value("8"))
                .andExpect(jsonPath("$.pickupPoints[0].section").value("Dordoi-Junhai"))
                .andExpect(jsonPath("$.pickupPoints[0].city").value("Bishkek"));
        sendJson("PUT", "/api/admin/shop/pickup-points/" + id, tokenFor(Role.ADMIN), Map.of("name", "AK&VEN at Dordoi", "market", "Dordoi Bazaar",
                "container", "71-E", "active", false)).andExpect(status().isOk());
        getJson("/api/shop/info", null).andExpect(jsonPath("$.pickupPoints").isEmpty());
        assertThat(auditLog.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("PICKUP_POINT", UUID.fromString(id))).hasSize(2);
    }

    private JsonNode pickupOrder(String phone) throws Exception {
        Variant v = data.variant(10);
        String buyer = tokenForEmail("pickup-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test", Role.CUSTOMER);
        Map<String, Object> body = Map.of("items", List.of(Map.of("sku", v.getSku(), "quantity", 2)),
                "fulfillment", Map.of("method", "PICKUP", "contactName", "Akylbek", "contactPhone", phone),
                "payment", Map.of("method", "APPLE_PAY", "token", "sim_apple_abcdef123456"));
        return json(mockMvc.perform(post("/api/orders").header("Authorization", buyer).header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType("application/json").content(objectMapper.writeValueAsString(body))).andExpect(status().isCreated()));
    }

    @Test
    void aPaidPickupOrderGetsACodeAndThePlaceToCollectIt() throws Exception {
        dordoi(true);
        JsonNode order = pickupOrder("+996 700 111 222");
        assertThat(order.get("pickup").get("code").asText()).matches("[0-9]{6}");
        assertThat(order.get("pickup").get("point").get("container").asText()).isEqualTo("70-E");

        // Staff see where, but not the code: the customer says it at the stall.
        JsonNode staffView = json(getJson("/api/admin/orders/" + order.get("id").asText(), tokenFor(Role.STAFF)));
        assertThat(staffView.get("pickup").get("code").isNull()).isTrue();
        assertThat(staffView.get("pickup").get("point").get("container").asText()).isEqualTo("70-E");
    }

    @Test
    void theOrderIsHandedOverOnlyWithCodeAndPhoneAndOnlyOnce() throws Exception {
        dordoi(true);
        JsonNode order = pickupOrder("+996 700 111 222");
        String code = order.get("pickup").get("code").asText();
        String staff = tokenFor(Role.STAFF);

        sendJson("POST", "/api/admin/orders/handover", staff, Map.of("code", code, "phoneEnd", "9999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("No order waiting for pickup matches this code and phone number."));
        sendJson("POST", "/api/admin/orders/handover", staff, Map.of("code", code, "phoneEnd", "1222"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("FULFILLED"));
        sendJson("POST", "/api/admin/orders/handover", staff, Map.of("code", code, "phoneEnd", "1222")).andExpect(status().isNotFound());
        sendJson("POST", "/api/admin/orders/handover", staff, Map.of("code", "12ab56", "phoneEnd", "1222")).andExpect(status().isBadRequest());
        sendJson("POST", "/api/admin/orders/handover", tokenFor(Role.CUSTOMER), Map.of("code", code, "phoneEnd", "1222")).andExpect(status().isForbidden());
        assertThat(auditLog.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("ORDER", UUID.fromString(order.get("id").asText())))
                .extracting("action").contains("ORDER_HANDED_OVER");
    }

    @Test
    void withoutAPickupPointTheOrderStillGetsACode() throws Exception {
        JsonNode order = pickupOrder("+996700333444");
        assertThat(order.get("pickup").get("code").asText()).matches("[0-9]{6}");
        assertThat(order.get("pickup").get("point").isNull()).isTrue();
    }
}
