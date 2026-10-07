package com.akven.thesis.sizes;

import com.akven.thesis.audit.AuditLogRepository;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** One size chart, read differently by language, a finder from shoe size to sock size, and owner-only editing. */
class SizeChartTest extends IntegrationTest {

    @Autowired private SizeChartRowRepository rows;
    @Autowired private AuditLogRepository auditLog;

    private static Map<String, Object> row(String label, double cmMin, double cmMax, int mmMin, int mmMax, int localMin, int localMax,
                                           int euMin, int euMax, String us, int position) {
        Map<String, Object> m = new HashMap<>();
        m.put("label", label);
        m.put("footCmMin", cmMin);
        m.put("footCmMax", cmMax);
        m.put("krMmMin", mmMin);
        m.put("krMmMax", mmMax);
        m.put("localMin", localMin);
        m.put("localMax", localMax);
        m.put("euMin", euMin);
        m.put("euMax", euMax);
        m.put("usLabel", us);
        m.put("position", position);
        return m;
    }

    private static final Map<String, Object> WOMEN = row("Women", 22.5, 26.0, 225, 260, 35, 41, 36, 41, "W 5.5–9.5", 1);
    private static final Map<String, Object> MEN = row("Men", 26.0, 29.0, 260, 290, 41, 45, 41, 46, "M 8–12", 2);

    @BeforeEach
    void chart() throws Exception {
        String admin = tokenFor(Role.ADMIN);
        sendJson("POST", "/api/admin/sizes", admin, MEN).andExpect(status().isCreated());
        sendJson("POST", "/api/admin/sizes", admin, WOMEN).andExpect(status().isCreated());
    }

    @AfterEach
    void clear() {
        rows.deleteAll();
    }

    @Test
    void englishLeadsWithEuAndUsAndRussianAndKyrgyzWithLocalSizes() throws Exception {
        getJson("/api/sizes?lang=en", null).andExpect(status().isOk())
                .andExpect(jsonPath("$.columns[1]").value("eu"))
                .andExpect(jsonPath("$.columns[2]").value("us"))
                .andExpect(jsonPath("$.rows[0].label").value("Women"))
                .andExpect(jsonPath("$.rows[0].us").value("W 5.5–9.5"));
        for (String lang : List.of("ru", "ky")) {
            JsonNode chart = json(getJson("/api/sizes?lang=" + lang, null));
            assertThat(chart.get("lang").asText()).isEqualTo(lang);
            assertThat(chart.get("columns").toString()).isEqualTo("[\"footCm\",\"local\",\"krMm\"]");
            assertThat(chart.get("rows").get(0).get("local").get("min").decimalValue()).isEqualByComparingTo("35");
        }
        assertThat(json(getJson("/api/sizes?lang=de", null)).get("lang").asText()).as("unknown languages read the English chart").isEqualTo("en");
    }

    @Test
    void theFinderTurnsAShoeSizeIntoASockSize() throws Exception {
        getJson("/api/sizes/find?system=LOCAL&size=38", null).andExpect(jsonPath("$.labels[0]").value("Women"));
        getJson("/api/sizes/find?system=EU&size=44", null).andExpect(jsonPath("$.labels[0]").value("Men"));
        getJson("/api/sizes/find?system=KR_MM&size=270", null).andExpect(jsonPath("$.labels[0]").value("Men"));
        getJson("/api/sizes/find?system=FOOT_CM&size=24.5", null).andExpect(jsonPath("$.labels[0]").value("Women"));
        // At a boundary both sizes fit, and the shop shows both.
        assertThat(json(getJson("/api/sizes/find?system=LOCAL&size=41", null)).get("labels")).hasSize(2);
        getJson("/api/sizes/find?system=EU&size=55", null).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("We have no sock size for that shoe size yet."));
        getJson("/api/sizes/find?system=US&size=9", null).andExpect(status().isBadRequest());
    }

    @Test
    void onlyOwnersEditTheChartAndBadRowsAreRefused() throws Exception {
        sendJson("POST", "/api/admin/sizes", tokenFor(Role.STAFF), row("Kids", 15, 21, 150, 210, 24, 33, 25, 34, "8C–2Y", 0))
                .andExpect(status().isForbidden());
        String admin = tokenFor(Role.ADMIN);
        sendJson("POST", "/api/admin/sizes", admin, WOMEN).andExpect(status().isConflict());
        sendJson("POST", "/api/admin/sizes", admin, row("Upside down", 26, 22, 225, 260, 35, 41, 36, 41, "x", 0))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Each range must start at or below where it ends."));
        sendJson("POST", "/api/admin/sizes", admin, row("Giant", 22, 26, 225, 260, 35, 41, 36, 99, "x", 0)).andExpect(status().isBadRequest());
    }

    @Test
    void rowsCanBeChangedAndRemovedAndEveryChangeIsAudited() throws Exception {
        String admin = tokenFor(Role.ADMIN);
        String id = json(getJson("/api/sizes", null)).get("rows").get(0).get("id").asText();
        Map<String, Object> changed = new HashMap<>(WOMEN);
        changed.put("localMax", 40);
        sendJson("PUT", "/api/admin/sizes/" + id, admin, changed).andExpect(status().isOk()).andExpect(jsonPath("$.local.max").value(40));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/admin/sizes/" + id)
                .header("Authorization", admin)).andExpect(status().isNoContent());
        assertThat(auditLog.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("SIZE_CHART_ROW", UUID.fromString(id)))
                .extracting("action").containsExactlyInAnyOrder("SIZE_ROW_CREATED", "SIZE_ROW_UPDATED", "SIZE_ROW_DELETED");
    }
}
