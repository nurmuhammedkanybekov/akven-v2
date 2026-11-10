package com.akven.thesis.stock;

import com.akven.thesis.catalog.AdminCatalogDtos.CreateProductRequest;
import com.akven.thesis.catalog.AdminCatalogDtos.CreateVariantRequest;
import com.akven.thesis.catalog.AdminCatalogDtos.UpdateVariantRequest;
import com.akven.thesis.catalog.Category;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.catalog.VariantRepository;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The stock ledger: every way the stock can change (a new variant, goods arriving, a sale, a cancelled sale, a count
 * by hand) leaves one row with its reason, and the rows always add up to the stock on the shelf.
 */
class StockLedgerTest extends IntegrationTest {

    @Autowired private VariantRepository variants;
    @Autowired private StockMovementRepository movements;

    private UUID newVariant(int stock) throws Exception {
        String id = UUID.randomUUID().toString().substring(0, 8);
        String admin = tokenFor(Role.ADMIN);
        JsonNode product = json(sendJson("POST", "/api/admin/products", admin, new CreateProductRequest("ledger-" + id,
                "Ledger Sock " + id, Category.MEN, null, null, "Ledger", "desc", "cotton", "Premium", "Wash cold", "Korea"))
                .andExpect(status().isCreated()));
        JsonNode variant = json(sendJson("POST", "/api/admin/products/" + product.get("id").asText() + "/variants", admin,
                new CreateVariantRequest("LG-" + id.toUpperCase(), "M", "Black", "#1f1d1a", 1, new BigDecimal("8.00"),
                        new BigDecimal("4.00"), new BigDecimal("15.00"), stock)).andExpect(status().isCreated()));
        return UUID.fromString(variant.get("id").asText());
    }

    private Variant variant(UUID id) {
        return variants.findById(id).orElseThrow();
    }

    private JsonNode buy(UUID variantId, int qty) throws Exception {
        String bearer = tokenForEmail("ledger-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test", Role.CUSTOMER);
        Map<String, Object> body = new HashMap<>(Map.of("items", List.of(Map.of("sku", variant(variantId).getSku(), "quantity", qty)),
                "fulfillment", Map.of("method", "PICKUP", "contactName", "Aida", "contactPhone", "+996 700 123 456"),
                "payment", Map.of("method", "APPLE_PAY", "token", "sim_apple_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12))));
        return json(mockMvc.perform(post("/api/orders").contentType("application/json").content(objectMapper.writeValueAsString(body))
                .header("Authorization", bearer).header("Idempotency-Key", UUID.randomUUID().toString()))
                .andExpect(status().isCreated()));
    }

    private List<String> reasonsNewestFirst(UUID variantId, String token) throws Exception {
        JsonNode rows = json(mockMvc.perform(get("/api/admin/variants/" + variantId + "/stock").header("Authorization", token))
                .andExpect(status().isOk()));
        List<String> reasons = new ArrayList<>();
        rows.forEach(r -> reasons.add(r.get("reason").asText()));
        return reasons;
    }

    @Test
    void everyChangeLeavesARowAndTheRowsAddUpToTheShelf() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID id = newVariant(10);                                                    // OPENING +10 -> 10

        sendJson("POST", "/api/admin/variants/" + id + "/receive", staff, Map.of("quantity", 5, "note", "Delivery 14"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.stockQty").value(15));  // RECEIVED +5 -> 15
        buy(id, 3);                                                                  // SALE -3 -> 12
        JsonNode second = buy(id, 2);                                                // SALE -2 -> 10
        sendJson("POST", "/api/admin/orders/" + second.get("id").asText() + "/cancel", staff, Map.of())
                .andExpect(status().isOk());                                         // CANCELLED +2 -> 12
        Variant v = variant(id);
        sendJson("PUT", "/api/admin/variants/" + id, staff, new UpdateVariantRequest("M", "Black", null, 1,
                new BigDecimal("8.00"), 11, true, v.getVersion())).andExpect(status().isOk());  // CORRECTION -1 -> 11

        assertThat(variant(id).getStockQty()).isEqualTo(11);
        assertThat(movements.sumByVariant(id)).isEqualTo(11);
        assertThat(reasonsNewestFirst(id, staff)).containsExactly("CORRECTION", "CANCELLED", "SALE", "SALE", "RECEIVED", "OPENING");

        // Each row's "stock after" is the one before it plus its own change: the history can be read like a bank statement.
        List<StockMovement> rows = new ArrayList<>(movements.findByVariantIdOrderByCreatedAtDescIdDesc(id, org.springframework.data.domain.Pageable.unpaged()));
        java.util.Collections.reverse(rows);
        int running = 0;
        for (StockMovement m : rows) {
            running += m.getDelta();
            assertThat(m.getStockAfter()).isEqualTo(running);
        }
        // A sale names its order and nobody on the staff; a delivery names who received it and the note.
        StockMovement received = rows.get(1);
        assertThat(received.getActor()).isNotBlank();
        assertThat(received.getNote()).isEqualTo("Delivery 14");
        assertThat(rows.get(2).getOrderId()).isNotNull();
        assertThat(rows.get(2).getActor()).isNull();
    }

    @Test
    void receivingGoodsShrinksWhatIsOnTheWay() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID id = newVariant(0);
        Map<String, Object> supply = new HashMap<>(Map.of("incomingQty", 30, "restockEta", java.time.LocalDate.now().plusDays(9).toString(),
                "version", variant(id).getVersion()));
        sendJson("PUT", "/api/admin/variants/" + id + "/supply", staff, supply).andExpect(status().isOk());

        sendJson("POST", "/api/admin/variants/" + id + "/receive", staff, Map.of("quantity", 20))
                .andExpect(status().isOk()).andExpect(jsonPath("$.incomingQty").value(10));
        sendJson("POST", "/api/admin/variants/" + id + "/receive", staff, Map.of("quantity", 10))
                .andExpect(status().isOk()).andExpect(jsonPath("$.incomingQty").value(0))
                .andExpect(jsonPath("$.restockEta").isEmpty());
        assertThat(variant(id).getStockQty()).isEqualTo(30);
        // A variant added with nothing on the shelf has no opening row: a change of zero is not a movement.
        assertThat(reasonsNewestFirst(id, staff)).containsExactly("RECEIVED", "RECEIVED");
    }

    @Test
    void nonsenseIsRefusedAndOnlyTheTeamSeesTheHistory() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID id = newVariant(4);
        sendJson("POST", "/api/admin/variants/" + id + "/receive", staff, Map.of("quantity", 0)).andExpect(status().isBadRequest());
        sendJson("POST", "/api/admin/variants/" + id + "/receive", staff, Map.of("quantity", -3)).andExpect(status().isBadRequest());
        sendJson("POST", "/api/admin/variants/" + id + "/receive", tokenFor(Role.CUSTOMER), Map.of("quantity", 3)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/variants/" + id + "/stock").header("Authorization", tokenFor(Role.CUSTOMER)))
                .andExpect(status().isForbidden());

        // Saving the form without changing the count is not a movement.
        sendJson("PUT", "/api/admin/variants/" + id, staff, new UpdateVariantRequest("M", "Black", null, 1,
                new BigDecimal("9.00"), 4, true, variant(id).getVersion())).andExpect(status().isOk());
        assertThat(reasonsNewestFirst(id, staff)).containsExactly("OPENING");
        assertThat(movements.sumByVariant(id)).isEqualTo(4);
    }
}
