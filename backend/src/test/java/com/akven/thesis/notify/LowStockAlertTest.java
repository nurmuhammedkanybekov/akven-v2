package com.akven.thesis.notify;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.pricing.CollectionPricing;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.ResultActions;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The automatic low-stock alert: the owners hear about a sock once, when a paid order takes it from above the
 * "few left" level to at or below it; not before, and not again for every later sale.
 */
class LowStockAlertTest extends IntegrationTest {

    @Autowired private OrderTestData data;
    @Autowired private OutboundEmailRepository emails;
    @Autowired private CollectionPricing collections;

    private ResultActions buy(Variant v, int qty) throws Exception {
        String bearer = tokenForEmail("low-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test", Role.CUSTOMER);
        Map<String, Object> body = new HashMap<>(Map.of("items", List.of(Map.of("sku", v.getSku(), "quantity", qty)),
                "fulfillment", Map.of("method", "PICKUP", "contactName", "Aida", "contactPhone", "+996 700 123 456"),
                "payment", Map.of("method", "APPLE_PAY", "token", "sim_apple_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12))));
        return mockMvc.perform(post("/api/orders").contentType("application/json").content(objectMapper.writeValueAsString(body))
                .header("Authorization", bearer).header("Idempotency-Key", UUID.randomUUID().toString()));
    }

    private List<OutboundEmail> alertsAbout(Variant v) {
        return emails.findAll().stream().filter(e -> e.getKind() == EmailKind.LOW_STOCK && e.getBody().contains(v.getSku())).toList();
    }

    @Test
    void theOwnersAreToldOnceWhenASaleTakesASockToTheFewLeftLevel() throws Exception {
        String owner = "owner-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test";
        tokenForEmail(owner, Role.ADMIN);
        int fewLeft = collections.policy().getFewLeftThreshold();
        Variant v = data.variant(fewLeft + 3);

        buy(v, 2).andExpect(status().isCreated());          // fewLeft + 1 left: still plenty
        assertThat(alertsAbout(v)).isEmpty();

        buy(v, 1).andExpect(status().isCreated());          // fewLeft left: the line is crossed
        List<OutboundEmail> alerts = alertsAbout(v);
        assertThat(alerts).extracting(OutboundEmail::getTo).contains(owner);
        OutboundEmail mine = alerts.stream().filter(e -> e.getTo().equals(owner)).findFirst().orElseThrow();
        assertThat(mine.getSubject()).contains("Running low");
        assertThat(mine.getBody()).contains(v.getProduct().getName()).contains(fewLeft + " left").contains("/admin/dashboard");
        assertThat(mine.getOrderId()).isNull();
        int sent = alerts.size();

        buy(v, 1).andExpect(status().isCreated());          // already below: no second alert for the same sock
        assertThat(alertsAbout(v)).hasSize(sent);
    }

    @Test
    void customersAndStaffAreNeverSentTheAlert() throws Exception {
        String staff = "staff-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test";
        tokenForEmail(staff, Role.STAFF);
        tokenForEmail("owner-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test", Role.ADMIN);
        int fewLeft = collections.policy().getFewLeftThreshold();
        Variant v = data.variant(fewLeft + 1);

        buy(v, 1).andExpect(status().isCreated());
        assertThat(alertsAbout(v)).isNotEmpty()
                .allSatisfy(e -> assertThat(e.getTo()).isNotEqualTo(staff).doesNotStartWith("low-"));
    }
}
