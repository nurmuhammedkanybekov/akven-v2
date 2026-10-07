package com.akven.thesis.order;

/** Which rule gave an order line its discount. Stored on the line, so "why this price?" can be answered later. */
public enum DiscountSource {
    NONE,
    TIER,
    NEGOTIATED
}
