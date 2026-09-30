package com.akven.thesis.order;

/**
 * Checkout reached the payment step and it did not go through. The order was cancelled and the stock released, and
 * that cancellation IS committed (see OrderService's noRollbackFor), so the customer can see what happened.
 * status is 402 for a decline, 502 when the payment service itself failed.
 */
public class PaymentFailedException extends RuntimeException {

    private final int status;
    private final OrderDtos.OrderView order;

    public PaymentFailedException(int status, String message, OrderDtos.OrderView order) {
        super(message);
        this.status = status;
        this.order = order;
    }

    public int status() { return status; }
    public OrderDtos.OrderView order() { return order; }
}
