package com.akven.thesis.payment;

import java.math.BigDecimal;

/**
 * What the shop needs from a payment service. The wallet hands the browser a one-time TOKEN; only that token ever
 * reaches our server, so card numbers never do. A real integration (an acquirer with Apple Pay and Google Pay
 * merchant accounts) would implement this interface; the rest of the application would not change.
 * Real merchant integration is out of scope for the thesis, so SimulatedWalletProvider is the only implementation.
 */
public interface PaymentProvider {

    boolean supports(PaymentMethod method);

    /** Charges the token. A decline is a normal result, not an exception. */
    PaymentResult charge(PaymentRequest request);

    /** Returns the money of an earlier charge. */
    void refund(String paymentReference, BigDecimal amount);
}
