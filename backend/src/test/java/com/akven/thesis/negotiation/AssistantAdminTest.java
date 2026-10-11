package com.akven.thesis.negotiation;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The super admin's assistant controls. The tests have no key, so the model is "not configured" here. */
class AssistantAdminTest extends IntegrationTest {

    @Autowired private OrderTestData data;
    @Autowired private JdbcTemplate jdbc;

    @AfterEach
    void clear() {
        jdbc.update("delete from app_setting");
    }

    @Test
    void onlyTheSuperAdminSeesAndChangesTheAssistant() throws Exception {
        for (Role role : new Role[]{Role.ADMIN, Role.STAFF, Role.CUSTOMER}) {
            getJson("/api/admin/assistant", tokenFor(role)).andExpect(status().isForbidden());
            sendJson("PUT", "/api/admin/assistant", tokenFor(role), Map.of("mode", "rules")).andExpect(status().isForbidden());
        }
        getJson("/api/admin/assistant", tokenFor(Role.SUPER_ADMIN)).andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("rules"))
                .andExpect(jsonPath("$.aiConfigured").value(false))
                .andExpect(jsonPath("$.model").value("gemini-3.5-flash-lite"));
    }

    @Test
    void theAiCannotBeSwitchedOnWithoutAKeyButTheRulesCanAndItIsAudited() throws Exception {
        String sup = tokenFor(Role.SUPER_ADMIN);
        sendJson("PUT", "/api/admin/assistant", sup, Map.of("mode", "ai")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("LLM_API_KEY")));
        sendJson("PUT", "/api/admin/assistant", sup, Map.of("mode", "magic")).andExpect(status().isBadRequest());
        sendJson("PUT", "/api/admin/assistant", sup, Map.of("mode", "rules")).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select count(*) from audit_log_entry where action = 'ASSISTANT_MODE_CHANGED'", Integer.class)).isPositive();
        sendJson("POST", "/api/admin/assistant/evaluation", sup, Map.of()).andExpect(status().isBadRequest());
    }

    @Test
    void aTestMessageShowsBothNumbersAndIsNotStored() throws Exception {
        Variant v = data.variant(5); // floor 15%
        int before = jdbc.queryForObject("select count(*) from negotiation_session", Integer.class);
        JsonNode r = json(sendJson("POST", "/api/admin/assistant/try", tokenFor(Role.SUPER_ADMIN),
                Map.of("sku", v.getSku(), "message", "50% please", "language", "ru")).andExpect(status().isOk()));
        assertThat(r.get("assistant").asText()).isEqualTo("rules");
        assertThat(r.get("proposedPct").decimalValue()).isEqualByComparingTo("50");
        assertThat(r.get("validatedPct").decimalValue()).isEqualByComparingTo("15");
        assertThat(r.get("reply").asText()).startsWith("Это лучшее").contains("15%").doesNotContain("50%");
        assertThat(jdbc.queryForObject("select count(*) from negotiation_session", Integer.class)).isEqualTo(before);
    }
}
