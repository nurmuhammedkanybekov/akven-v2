package com.akven.thesis.family;

import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The family a customer keeps in their account: saved whole, read back in order, private to its owner. */
class FamilyTest extends IntegrationTest {

    private String customer() {
        return tokenForEmail("family-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test", Role.CUSTOMER);
    }

    private static Map<String, Object> member(String name, String role, int shoe, int pairs, String birthday) {
        Map<String, Object> m = new HashMap<>();
        m.put("name", name);
        m.put("role", role);
        m.put("shoeSize", shoe);
        m.put("pairs", pairs);
        m.put("birthday", birthday);
        return m;
    }

    @Test
    void aCustomerSavesTheirFamilyAndReadsItBackInOrder() throws Exception {
        String me = customer();
        assertThat(json(getJson("/api/family", me).andExpect(status().isOk()))).isEmpty();

        List<Map<String, Object>> family = List.of(member("  Akylbek  ", "dad", 43, 5, "1975-03-08"),
                member("Venera", "mom", 38, 5, null), member(null, "son", 33, 3, null));
        JsonNode saved = json(sendJson("PUT", "/api/family", me, Map.of("members", family)).andExpect(status().isOk()));
        assertThat(saved).hasSize(3);
        assertThat(saved.get(0).get("name").asText()).isEqualTo("Akylbek");
        assertThat(saved.get(0).get("birthday").asText()).isEqualTo("1975-03-08");
        assertThat(saved.get(2).get("name").isNull()).isTrue();

        // Saving again replaces the list, in the new order.
        sendJson("PUT", "/api/family", me, Map.of("members", List.of(family.get(1), family.get(0)))).andExpect(status().isOk());
        JsonNode again = json(getJson("/api/family", me).andExpect(status().isOk()));
        assertThat(again).hasSize(2);
        assertThat(again.get(0).get("name").asText()).isEqualTo("Venera");

        // Someone else's family is their own: a new customer sees an empty list.
        assertThat(json(getJson("/api/family", customer()).andExpect(status().isOk()))).isEmpty();

        sendJson("PUT", "/api/family", me, Map.of("members", List.of())).andExpect(status().isOk());
        assertThat(json(getJson("/api/family", me))).isEmpty();
    }

    @Test
    void wrongValuesAreRefusedAndNothingChanges() throws Exception {
        String me = customer();
        sendJson("PUT", "/api/family", me, Map.of("members", List.of(member("Aida", "mom", 37, 2, null)))).andExpect(status().isOk());

        sendJson("PUT", "/api/family", me, Map.of("members", List.of(member("X", "uncle", 40, 1, null)))).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/family", me, Map.of("members", List.of(member("X", "dad", 60, 1, null)))).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/family", me, Map.of("members", List.of(member("X", "dad", 40, 31, null)))).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/family", me, Map.of("members", List.of(member("<script>", "dad", 40, 1, null)))).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/family", me, Map.of("members", List.of(member("X", "dad", 40, 1, "2999-01-01")))).andExpect(status().isBadRequest());
        List<Map<String, Object>> tooMany = new ArrayList<>();
        for (int i = 0; i < FamilyService.MAX_MEMBERS + 1; i++) tooMany.add(member("K" + i, "son", 30, 1, null));
        sendJson("PUT", "/api/family", me, Map.of("members", tooMany)).andExpect(status().isBadRequest());

        JsonNode still = json(getJson("/api/family", me));
        assertThat(still).hasSize(1);
        assertThat(still.get(0).get("name").asText()).isEqualTo("Aida");
    }

    @Test
    void theFamilyNeedsASignIn() throws Exception {
        getJson("/api/family", null).andExpect(status().isUnauthorized());
        sendJson("PUT", "/api/family", null, Map.of("members", List.of())).andExpect(status().isUnauthorized());
    }
}
