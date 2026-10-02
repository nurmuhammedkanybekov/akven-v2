package com.akven.thesis.payment;

import com.akven.thesis.common.BusinessRuleException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PaymentServiceTest {

    private final PaymentService service = new PaymentService(List.of(new SimulatedWalletProvider()));

    private PaymentRequest request(PaymentMethod m, String token) {
        return new PaymentRequest(m, token, new BigDecimal("12.50"), "AV-TEST");
    }

    @Test
    void approvesAWellFormedWalletTokenAndReturnsAReferenceNotTheToken() {
        PaymentResult r = service.charge(request(PaymentMethod.APPLE_PAY, "sim_apple_abcdef123456"));
        assertThat(r.approved()).isTrue();
        assertThat(r.reference()).startsWith("sim_pay_").doesNotContain("abcdef123456");
    }

    @Test
    void theTokenDecidesTheSimulatedOutcome() {
        assertThat(service.charge(request(PaymentMethod.GOOGLE_PAY, "sim_google_declined0000")).approved()).isFalse();
        assertThatThrownBy(() -> service.charge(request(PaymentMethod.GOOGLE_PAY, "sim_google_unavailable00")))
                .isInstanceOf(PaymentUnavailableException.class);
    }

    @Test
    void refusesAnythingThatLooksLikeACardNumberWithAClearMessage() {
        for (String card : List.of("4242424242424242", "4242 4242 4242 4242", "4242-4242-4242-4242")) {
            assertThatThrownBy(() -> service.charge(request(PaymentMethod.APPLE_PAY, card)))
                    .isInstanceOf(BusinessRuleException.class).hasMessageContaining("Card numbers are never accepted");
        }
    }

    @Test
    void refusesTokensThatAreMissingMalformedOrForTheOtherWallet() {
        assertThatThrownBy(() -> service.charge(request(PaymentMethod.APPLE_PAY, " "))).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> service.charge(request(PaymentMethod.APPLE_PAY, "hello"))).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> service.charge(request(PaymentMethod.APPLE_PAY, "sim_google_abcdef123456"))).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> service.charge(request(PaymentMethod.GOOGLE_PAY, "sim_google_short"))).isInstanceOf(BusinessRuleException.class);
        assertThatThrownBy(() -> service.charge(request(PaymentMethod.GOOGLE_PAY, "sim_google_abc'; drop table--")))
                .isInstanceOf(BusinessRuleException.class);
    }
}
