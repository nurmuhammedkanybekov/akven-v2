package com.akven.thesis.payment;

import com.akven.thesis.order.OrderRepository;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.user.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * A server started without demo mode has no payment provider: it says so to the shop, and a checkout is refused before
 * anything is reserved or stored, instead of being "paid" by a simulated wallet that moves no money.
 */
@TestPropertySource(properties = "akven.payments.provider=none")
class PaymentsNotSetUpTest extends IntegrationTest {

    @Autowired private OrderRepository orders;
    @Autowired private PaymentService payments;

    @Test
    void withoutAProviderTheShopSaysSoAndACheckoutIsRefusedBeforeAnythingIsStored() throws Exception {
        assertThat(payments.mode()).isEqualTo(PaymentMode.NONE);
        getJson("/api/shop/info", null).andExpect(status().isOk()).andExpect(jsonPath("$.payments").value("NONE"));

        long before = orders.count();
        Map<String, Object> body = Map.of(
                "items", List.of(Map.of("sku", "ANY-SKU-1", "quantity", 1)),
                "fulfillment", Map.of("method", "PICKUP", "contactName", "Aida", "contactPhone", "+996700000000"),
                "payment", Map.of("method", "APPLE_PAY", "token", "sim_apple_abcdefabcdef12"));
        mockMvc.perform(post("/api/orders").header("Authorization", tokenFor(Role.CUSTOMER)).header("Idempotency-Key", "no-provider-key-123456")
                        .contentType("application/json").content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Online payment is not set up in this shop yet."))
                .andExpect(jsonPath("$.code").value("PAYMENT_NOT_SET_UP"));
        assertThat(orders.count()).isEqualTo(before);
    }
}
