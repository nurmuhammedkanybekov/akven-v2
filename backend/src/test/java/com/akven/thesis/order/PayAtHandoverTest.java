package com.akven.thesis.order;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.notify.EmailKind;
import com.akven.thesis.notify.OutboundEmail;
import com.akven.thesis.notify.OutboundEmailRepository;
import com.akven.thesis.stock.StockMovementRepository;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Reserve now, pay at handover: nothing is charged online, the pairs are held (not sold) until the team takes the money,
 * and a reservation nobody collects ends by itself and gives its pairs back.
 */
class PayAtHandoverTest extends IntegrationTest {

    private static final String PHONE = "+996 700 555 321";

    @Autowired private OrderTestData data;
    @Autowired private OrderService orderService;
    @Autowired private OrderRepository orders;
    @Autowired private StockMovementRepository movements;
    @Autowired private OutboundEmailRepository emails;

    private String customer() throws Exception {
        return tokenForEmail("reserve-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test", Role.CUSTOMER);
    }

    private ResultActions reserve(String bearer, Variant v, int qty) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of("items", List.of(Map.of("sku", v.getSku(), "quantity", qty)),
                "fulfillment", Map.of("method", "PICKUP", "contactName", "Aida", "contactPhone", PHONE),
                "payment", Map.of("method", "PAY_AT_HANDOVER")));
        return mockMvc.perform(post("/api/orders").contentType("application/json").content(objectMapper.writeValueAsString(body))
                .header("Authorization", bearer).header("Idempotency-Key", UUID.randomUUID().toString()));
    }

    private List<OutboundEmail> emailsAbout(UUID orderId) {
        return emails.findAll().stream().filter(e -> orderId.equals(e.getOrderId())).toList();
    }

    @Test
    void aReservationHoldsThePairsAndTheyAreSoldOnlyWhenPaidAtTheStall() throws Exception {
        Variant v = data.variant(10);
        JsonNode order = json(reserve(customer(), v, 3).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("RESERVED"))
                .andExpect(jsonPath("$.payOnHandover").value(true))
                .andExpect(jsonPath("$.reservedUntil").isNotEmpty())
                .andExpect(jsonPath("$.payment").isEmpty()));
        UUID id = UUID.fromString(order.get("id").asText());
        String code = order.get("pickup").get("code").asText();
        assertThat(code).matches("[0-9]{6}");

        // Held, not sold: nobody else can buy these three, but the shelf still has ten and the ledger has no sale.
        Variant held = data.reload(v);
        assertThat(held.getStockQty()).isEqualTo(10);
        assertThat(held.available()).isEqualTo(7);
        assertThat(movements.sumByVariant(v.getId())).isZero();
        OutboundEmail mail = emailsAbout(id).get(0);
        assertThat(mail.getSubject()).contains("is reserved");
        assertThat(mail.getBody()).contains("To pay at handover: $30.00").doesNotContain("it is paid");

        // At the stall: the code and the phone, the money, and only now the sale.
        sendJson("POST", "/api/admin/orders/handover", tokenFor(Role.STAFF), Map.of("code", code, "phoneEnd", "5321"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("FULFILLED"))
                .andExpect(jsonPath("$.paidAt").isNotEmpty());
        Variant sold = data.reload(v);
        assertThat(sold.getStockQty()).isEqualTo(7);
        assertThat(sold.available()).isEqualTo(7);
        assertThat(sold.getReservedQty()).isZero();
        assertThat(movements.sumByVariant(v.getId())).isEqualTo(-3);
    }

    @Test
    void aReservationNobodyCollectsEndsAndGivesThePairsBack() throws Exception {
        Variant v = data.variant(5);
        JsonNode order = json(reserve(customer(), v, 2).andExpect(status().isCreated()));
        UUID id = UUID.fromString(order.get("id").asText());

        assertThat(orderService.expireReservations(Instant.now())).isZero();           // not yet
        int ended = orderService.expireReservations(Instant.now().plus(Duration.ofHours(49)));
        assertThat(ended).isGreaterThanOrEqualTo(1);

        assertThat(orders.findById(id).orElseThrow().getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(data.reload(v).available()).isEqualTo(5);
        assertThat(emailsAbout(id)).extracting(OutboundEmail::getSubject).anyMatch(s -> s.contains("has ended"));
        // The code is free again: the same reservation cannot be handed over any more.
        sendJson("POST", "/api/admin/orders/handover", tokenFor(Role.STAFF),
                Map.of("code", order.get("pickup").get("code").asText(), "phoneEnd", "5321")).andExpect(status().isNotFound());
    }

    @Test
    void theCustomerCanCancelAReservationAndNothingIsRefunded() throws Exception {
        Variant v = data.variant(4);
        String bearer = customer();
        JsonNode order = json(reserve(bearer, v, 1).andExpect(status().isCreated()));
        UUID id = UUID.fromString(order.get("id").asText());
        mockMvc.perform(post("/api/orders/" + id + "/cancel").header("Authorization", bearer))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
        assertThat(data.reload(v).available()).isEqualTo(4);
        assertThat(emailsAbout(id)).filteredOn(e -> e.getKind() == EmailKind.ORDER_CANCELLED)
                .singleElement().satisfies(e -> assertThat(e.getBody()).contains("Nothing was paid"));
    }

    @Test
    void theTeamCanAlsoMarkAReservationPaidFromTheOrderPage() throws Exception {
        Variant v = data.variant(6);
        JsonNode order = json(reserve(customer(), v, 2).andExpect(status().isCreated()));
        sendJson("POST", "/api/admin/orders/" + order.get("id").asText() + "/fulfil", tokenFor(Role.STAFF), Map.of())
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("FULFILLED"));
        assertThat(data.reload(v).getStockQty()).isEqualTo(4);
    }

    @Test
    void oneReservationCannotEmptyTheShelf() throws Exception {
        Variant v = data.variant(200);
        reserve(customer(), v, 61).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("RESERVE_TOO_BIG"));
        assertThat(data.reload(v).available()).isEqualTo(200);
    }
}
