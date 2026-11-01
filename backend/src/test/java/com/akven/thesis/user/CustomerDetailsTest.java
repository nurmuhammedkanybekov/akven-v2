package com.akven.thesis.user;

import com.akven.thesis.delivery.DeliveryZoneRepository;
import com.akven.thesis.order.Country;
import com.akven.thesis.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Saved details: only for the signed-in customer, their own only, checked like checkout, forgotten on request. */
class CustomerDetailsTest extends IntegrationTest {

    @Autowired private DeliveryZoneRepository zones;

    private String customer() {
        return tokenForEmail("details-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test", Role.CUSTOMER);
    }

    private Map<String, Object> details(String name, String phone, String address, String country, Object zone) {
        Map<String, Object> m = new HashMap<>();
        m.put("contactName", name);
        m.put("contactPhone", phone);
        m.put("address", address);
        m.put("country", country);
        m.put("zoneId", zone);
        return m;
    }

    @Test
    void aCustomerKeepsAndForgetsTheirOwnDetails() throws Exception {
        getJson("/api/account/details", null).andExpect(status().isUnauthorized());
        String aida = customer(), bek = customer();
        JsonNode empty = json(getJson("/api/account/details", aida).andExpect(status().isOk()));
        assertThat(empty.get("contactName").isNull()).isTrue();

        UUID kz = zones.findByCountryAndActiveTrueOrderByPositionAscNameAsc(Country.KZ).get(0).getId();
        JsonNode saved = json(sendJson("PUT", "/api/account/details", aida,
                details("  Aida\u0007  K. ", "+996 700 123 456", "Abay 1,\n Almaty", null, kz.toString())).andExpect(status().isOk()));
        assertThat(saved.get("contactName").asText()).isEqualTo("Aida K.");
        assertThat(saved.get("address").asText()).isEqualTo("Abay 1, Almaty");
        assertThat(saved.get("country").asText()).isEqualTo("KZ");           // taken from the area

        // Another customer sees nothing of it.
        assertThat(json(getJson("/api/account/details", bek)).get("contactName").isNull()).isTrue();

        sendJson("PUT", "/api/account/details", aida, details("Aida", "call me", null, null, null)).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/account/details", aida, details("Aida", null, null, "RU", kz.toString())).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/account/details", aida, details("Aida", null, null, null, UUID.randomUUID().toString())).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/account/details", aida, details("x".repeat(121), null, null, null, null)).andExpect(status().isBadRequest());

        mockMvc.perform(delete("/api/account/details").header("Authorization", aida)).andExpect(status().isNoContent());
        assertThat(json(getJson("/api/account/details", aida)).get("contactPhone").isNull()).isTrue();
        // Forgetting twice is fine.
        mockMvc.perform(delete("/api/account/details").header("Authorization", aida)).andExpect(status().isNoContent());
    }
}
