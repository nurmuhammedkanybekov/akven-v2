package com.akven.thesis.delivery;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.support.OrderTestData;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
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

/** Delivery areas: the owners set the price and the time, the checkout charges it, and an old receipt never changes. */
class DeliveryZoneTest extends IntegrationTest {

    @Autowired private OrderTestData data;

    private Map<String, Object> zone(String country, String name, String fee, String freeFrom, Integer min, Integer max) {
        Map<String, Object> m = new HashMap<>();
        m.put("country", country);
        m.put("name", name);
        m.put("fee", fee);
        m.put("freeFrom", freeFrom);
        m.put("daysMin", min);
        m.put("daysMax", max);
        m.put("active", true);
        m.put("position", 1);
        return m;
    }

    private ResultActions deliver(String bearer, Variant v, int qty, Map<String, Object> fulfilment) throws Exception {
        Map<String, Object> f = new HashMap<>(Map.of("method", "DELIVERY", "contactName", "Aida", "contactPhone", "+996 700 123 456",
                "address", "Chui avenue 1, Bishkek"));
        f.putAll(fulfilment);
        Map<String, Object> body = Map.of("items", List.of(Map.of("sku", v.getSku(), "quantity", qty)), "fulfillment", f,
                "payment", Map.of("method", "APPLE_PAY", "token", "sim_apple_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12)));
        return mockMvc.perform(post("/api/orders").contentType("application/json").content(objectMapper.writeValueAsString(body))
                .header("Authorization", bearer).header("Idempotency-Key", UUID.randomUUID().toString()));
    }

    private String customer() {
        return tokenForEmail("zone-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test", Role.CUSTOMER);
    }

    @Test
    void everyCountryStartsWithAFreeAreaSoDeliveryWorksAsBefore() throws Exception {
        JsonNode zones = json(getJson("/api/shop/delivery-zones", null).andExpect(status().isOk()));
        List<String> countries = new java.util.ArrayList<>();
        zones.forEach(z -> countries.add(z.get("country").asText()));
        assertThat(countries).contains("KG", "KZ", "UZ", "RU");

        Variant v = data.variant(10);
        JsonNode order = json(deliver(customer(), v, 2, Map.of("country", "KZ")).andExpect(status().isCreated()));
        assertThat(order.get("total").decimalValue()).isEqualByComparingTo("20.00");
        assertThat(order.at("/fulfillment/country").asText()).isEqualTo("KZ");
        assertThat(order.at("/fulfillment/delivery/zone").asText()).isEqualTo("Kazakhstan");
        assertThat(order.at("/fulfillment/delivery/fee").decimalValue()).isZero();
    }

    @Test
    void theOwnersSetAPriceAndTheCheckoutChargesIt() throws Exception {
        String owner = tokenFor(Role.ADMIN);
        sendJson("POST", "/api/admin/delivery-zones", tokenFor(Role.STAFF), zone("KG", "Bishkek", "2.00", "40.00", 1, 2)).andExpect(status().isForbidden());
        sendJson("POST", "/api/admin/delivery-zones", owner, zone("KG", "Bishkek", "2.00", "40.00", 3, 2)).andExpect(status().isBadRequest());
        sendJson("POST", "/api/admin/delivery-zones", owner, zone("KG", "Bishkek", "0.00", "40.00", 1, 2)).andExpect(status().isBadRequest());
        sendJson("POST", "/api/admin/delivery-zones", owner, zone("KG", "Bishkek", "-1", null, 1, 2)).andExpect(status().isBadRequest());
        String name = "Bishkek " + UUID.randomUUID().toString().substring(0, 4);
        JsonNode created = json(sendJson("POST", "/api/admin/delivery-zones", owner, zone("KG", "  " + name + " ", "2.00", "40.00", 1, 2))
                .andExpect(status().isCreated()));
        assertThat(created.get("name").asText()).isEqualTo(name);
        String id = created.get("id").asText();

        Variant v = data.variant(20);
        String buyer = customer();
        JsonNode small = json(deliver(buyer, v, 2, Map.of("zoneId", id)).andExpect(status().isCreated()));
        assertThat(small.get("total").decimalValue()).isEqualByComparingTo("22.00");
        assertThat(small.at("/fulfillment/delivery/fee").decimalValue()).isEqualByComparingTo("2.00");
        assertThat(small.at("/fulfillment/delivery/daysMax").asInt()).isEqualTo(2);
        // A fee sent by the browser is ignored: only the area decides.
        JsonNode big = json(deliver(buyer, v, 4, Map.of("zoneId", id, "fee", "0")).andExpect(status().isCreated()));
        assertThat(big.get("total").decimalValue()).isEqualByComparingTo("40.00");
        assertThat(big.at("/fulfillment/delivery/fee").decimalValue()).isZero();

        // Changing the area and then removing it never changes the receipt.
        Map<String, Object> dearer = zone("KG", name, "5.00", null, 1, 3);
        sendJson("PUT", "/api/admin/delivery-zones/" + id, owner, dearer).andExpect(status().isOk());
        dearer.put("active", false);
        sendJson("PUT", "/api/admin/delivery-zones/" + id, owner, dearer).andExpect(status().isOk());
        deliver(buyer, v, 2, Map.of("zoneId", id)).andExpect(status().isBadRequest());
        sendJson("DELETE", "/api/admin/delivery-zones/" + id, owner, Map.of()).andExpect(status().isNoContent());
        JsonNode again = json(getJson("/api/orders/" + small.get("id").asText(), buyer).andExpect(status().isOk()));
        assertThat(again.at("/fulfillment/delivery/zone").asText()).isEqualTo(name);
        assertThat(again.get("total").decimalValue()).isEqualByComparingTo("22.00");
        deliver(buyer, v, 2, Map.of("zoneId", UUID.randomUUID().toString())).andExpect(status().isBadRequest());
    }

    @Test
    void aCargoAreaIsPaidToTheCarrierOnReceiptAndTheOrderKeepsSaying() throws Exception {
        String owner = tokenFor(Role.ADMIN);
        Map<String, Object> cargo = zone("KG", "Bus cargo " + UUID.randomUUID().toString().substring(0, 6), "0.00", null, 2, 4);
        cargo.put("kind", "CARGO");
        cargo.put("payOnReceipt", true);
        cargo.put("note", "  We hand the parcel to the bus cargo at Dordoi.  ");
        JsonNode created = json(sendJson("POST", "/api/admin/delivery-zones", owner, cargo).andExpect(status().isCreated()));
        assertThat(created.get("kind").asText()).isEqualTo("CARGO");
        assertThat(created.get("payOnReceipt").asBoolean()).isTrue();
        assertThat(created.get("note").asText()).isEqualTo("We hand the parcel to the bus cargo at Dordoi.");

        // a courier area never has the carrier paid on receipt, whatever is sent
        Map<String, Object> courier = zone("KG", "Courier " + UUID.randomUUID().toString().substring(0, 6), "2.00", null, 1, 1);
        courier.put("payOnReceipt", true);
        JsonNode c = json(sendJson("POST", "/api/admin/delivery-zones", owner, courier).andExpect(status().isCreated()));
        assertThat(c.get("kind").asText()).isEqualTo("COURIER");
        assertThat(c.get("payOnReceipt").asBoolean()).isFalse();

        String buyer = customer();
        JsonNode order = json(deliver(buyer, data.variant(10), 2, Map.of("zoneId", created.get("id").asText(), "address", "Osh, Lenin street 5, Aida"))
                .andExpect(status().isCreated()));
        assertThat(order.at("/fulfillment/delivery/kind").asText()).isEqualTo("CARGO");
        assertThat(order.at("/fulfillment/delivery/payOnReceipt").asBoolean()).isTrue();
        assertThat(order.at("/fulfillment/delivery/fee").decimalValue()).isZero();

        // the receipt keeps saying so after the owners change the area
        cargo.put("payOnReceipt", false);
        cargo.put("kind", "COURIER");
        sendJson("PUT", "/api/admin/delivery-zones/" + created.get("id").asText(), owner, cargo).andExpect(status().isOk());
        JsonNode again = json(getJson("/api/orders/" + order.get("id").asText(), buyer).andExpect(status().isOk()));
        assertThat(again.at("/fulfillment/delivery/kind").asText()).isEqualTo("CARGO");
        assertThat(again.at("/fulfillment/delivery/payOnReceipt").asBoolean()).isTrue();
    }

    @Autowired private DeliveryService delivery;
    @Autowired private DeliveryZoneRepository zones;

    @Test
    void anAreaMustMatchTheCountryAndACountryWithoutAreasIsRefused() {
        DeliveryZone kz = zones.findByCountryAndActiveTrueOrderByPositionAscNameAsc(com.akven.thesis.order.Country.KZ).get(0);
        assertThat(delivery.zoneFor(kz.getId(), com.akven.thesis.order.Country.KZ).getId()).isEqualTo(kz.getId());
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> delivery.zoneFor(kz.getId(), com.akven.thesis.order.Country.RU))
                .isInstanceOf(com.akven.thesis.common.BusinessRuleException.class);
        assertThat(delivery.zoneFor(null, null).getCountry()).isEqualTo(com.akven.thesis.order.Country.KG);
        assertThat(kz.feeFor(new java.math.BigDecimal("1000"))).isZero();
    }
}
