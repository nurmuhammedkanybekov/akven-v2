package com.akven.thesis.order;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/** Six random digits for collecting an order, different from every other order still waiting at the stall. */
@Component
class PickupCodes {

    private static final int ATTEMPTS = 20;

    private final SecureRandom random = new SecureRandom();
    private final OrderRepository orders;

    PickupCodes(OrderRepository orders) {
        this.orders = orders;
    }

    String next() {
        for (int i = 0; i < ATTEMPTS; i++) {
            String code = String.format("%06d", random.nextInt(1_000_000));
            if (!orders.existsByPickupCodeAndStatus(code, OrderStatus.PAID)) {
                return code;
            }
        }
        // A million codes and a handful of open orders: reaching this means something else is wrong.
        throw new IllegalStateException("Could not find a free pickup code");
    }
}
