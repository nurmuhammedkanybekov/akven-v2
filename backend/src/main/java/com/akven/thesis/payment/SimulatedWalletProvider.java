package com.akven.thesis.payment;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * A stand-in for Apple Pay / Google Pay that behaves like the real thing from the application's point of view:
 * it receives a token, confirms or declines it, and returns a reference. No money moves.
 *
 * For the demo and the tests, the token decides the outcome: a token containing "declined" is declined by the
 * "bank", one containing "unavailable" simulates the provider being down, anything else is approved.
 */
@Component
public class SimulatedWalletProvider implements PaymentProvider {

    private static final Logger log = LoggerFactory.getLogger(SimulatedWalletProvider.class);

    @Override
    public boolean supports(PaymentMethod method) {
        return method == PaymentMethod.APPLE_PAY || method == PaymentMethod.GOOGLE_PAY;
    }

    @Override
    public PaymentResult charge(PaymentRequest request) {
        String token = request.token();
        if (token.contains("unavailable")) {
            throw new PaymentUnavailableException("The simulated payment service is unavailable.");
        }
        if (token.contains("declined")) {
            return PaymentResult.declined("Your bank declined the payment. You have not been charged.");
        }
        String reference = "sim_pay_" + UUID.randomUUID();
        log.info("Simulated {} charge of {} for order {} approved as {}", request.method(), request.amount(), request.orderReference(), reference);
        return PaymentResult.approved(reference);
    }

    @Override
    public void refund(String paymentReference, BigDecimal amount) {
        log.info("Simulated refund of {} for {}", amount, paymentReference);
    }
}
