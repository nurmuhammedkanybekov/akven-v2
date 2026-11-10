package com.akven.thesis.order;

public enum OrderStatus {
    PENDING,
    /** Put aside for the customer, who pays at handover (at the stall or to the courier); expires if not collected. */
    RESERVED,
    PAID,
    FULFILLED,
    CANCELLED
}
