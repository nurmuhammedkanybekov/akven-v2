package com.akven.thesis.stock;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** "Tell me when it is back": a customer joins the waiting list of a sold-out option; the owners see it and answer. */
class StockRequestTest extends IntegrationTest {

    @Autowired private OrderTestData data;

    private String customer() {
        return tokenForEmail("waits-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test", Role.CUSTOMER);
    }

    private JsonNode waitingFor(String sku) throws Exception {
        for (JsonNode w : json(getJson("/api/admin/stock-requests", tokenFor(Role.ADMIN)).andExpect(status().isOk()))) {
            if (w.get("sku").asText().equals(sku)) return w;
        }
        return null;
    }

    @Test
    void aCustomerWaitsForASoldOutOptionAndTheOwnersSeeAndAnswerIt() throws Exception {
        Variant soldOut = data.variant(0);
        String token = customer();

        JsonNode mine = json(sendJson("PUT", "/api/stock-requests/" + soldOut.getSku(), token, Map.of()).andExpect(status().isOk()));
        assertThat(mine).extracting(JsonNode::asText).contains(soldOut.getSku());
        sendJson("PUT", "/api/stock-requests/" + soldOut.getSku(), token, Map.of()).andExpect(status().isOk());   // twice is once

        JsonNode waiting = waitingFor(soldOut.getSku());
        assertThat(waiting).isNotNull();
        assertThat(waiting.get("customers")).hasSize(1);
        assertThat(waiting.get("customers").get(0).get("email").asText()).startsWith("waits-");

        String requestId = waiting.get("customers").get(0).get("requestId").asText();
        sendJson("PUT", "/api/admin/stock-requests/" + requestId + "/answered", tokenFor(Role.STAFF), Map.of()).andExpect(status().isNoContent());
        assertThat(waitingFor(soldOut.getSku())).isNull();
        assertThat(json(getJson("/api/stock-requests", token).andExpect(status().isOk()))).isEmpty();
    }

    @Test
    void anOptionInStockGoesInTheBagInsteadAndACustomerCanChangeTheirMind() throws Exception {
        String token = customer();
        sendJson("PUT", "/api/stock-requests/" + data.variant(10).getSku(), token, Map.of()).andExpect(status().isBadRequest());
        Variant soldOut = data.variant(0);
        sendJson("PUT", "/api/stock-requests/" + soldOut.getSku(), token, Map.of()).andExpect(status().isOk());
        assertThat(json(sendJson("DELETE", "/api/stock-requests/" + soldOut.getSku(), token, Map.of()).andExpect(status().isOk()))).isEmpty();
        sendJson("PUT", "/api/stock-requests/NO-SUCH-SKU", token, Map.of()).andExpect(status().isNotFound());
    }

    @Test
    void onlySignedInCustomersAskAndOnlyTheTeamSeesTheList() throws Exception {
        sendJson("PUT", "/api/stock-requests/ANY", null, Map.of()).andExpect(status().isUnauthorized());
        getJson("/api/admin/stock-requests", customer()).andExpect(status().isForbidden());
    }
}
