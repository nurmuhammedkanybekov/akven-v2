package com.akven.thesis.payment;

/** The payment service could not be reached or failed. Nothing was charged. */
public class PaymentUnavailableException extends RuntimeException {
    public PaymentUnavailableException(String message) {
        super(message);
    }
}
