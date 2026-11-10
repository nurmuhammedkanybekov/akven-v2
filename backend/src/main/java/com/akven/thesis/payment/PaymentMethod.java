package com.akven.thesis.payment;

/**
 * How the customer pays. The wallets are charged online; card numbers are never accepted directly (FR-7, NFR-4).
 * PAY_AT_HANDOVER charges nothing online: the order is reserved and paid in cash or by bank app at handover.
 */
public enum PaymentMethod {
    APPLE_PAY, GOOGLE_PAY, PAY_AT_HANDOVER;

    public boolean online() { return this != PAY_AT_HANDOVER; }
}
