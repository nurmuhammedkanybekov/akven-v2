package com.akven.thesis.order;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Every few minutes, ends the reservations (pay at handover) whose time is up. Scheduling is on (EmailScheduler). */
@Component
class ReservationExpiry {

    private static final Logger log = LoggerFactory.getLogger(ReservationExpiry.class);

    private final OrderService orders;

    ReservationExpiry(OrderService orders) {
        this.orders = orders;
    }

    @Scheduled(fixedDelayString = "${akven.orders.expiry-poll-ms:300000}", initialDelay = 60000)
    void run() {
        int ended = orders.expireReservations(Instant.now());
        if (ended > 0) log.info("{} reservation(s) were not collected in time and went back on the shelf", ended);
    }
}
