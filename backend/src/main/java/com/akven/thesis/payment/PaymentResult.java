package com.akven.thesis.payment;

/** reference is what gets stored on the order (never the token); declineReason is shown to the customer. */
public record PaymentResult(boolean approved, String reference, String declineReason) {

    public static PaymentResult approved(String reference) {
        return new PaymentResult(true, reference, null);
    }

    public static PaymentResult declined(String reason) {
        return new PaymentResult(false, null, reason);
    }
}
