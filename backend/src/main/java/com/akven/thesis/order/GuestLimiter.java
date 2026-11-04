package com.akven.thesis.order;

import com.akven.thesis.negotiation.TooManyRequestsException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Checkout without an account, and "send me the link again", need no sign-in, so each is limited per visitor address
 * in a sliding hour: generous for a person (a family orders a few times, a phone retries), tight for a script that
 * would hold stock with unpaid attempts or send emails to strangers. In memory and per instance, like the other limiters.
 */
@Component
public class GuestLimiter {

    static final int SWEEP_AT = 10_000;

    private final Map<String, Deque<Instant>> hits = new ConcurrentHashMap<>();
    private final int checkouts;
    private final int finds;
    private final Duration window = Duration.ofHours(1);
    private final Clock clock;

    @Autowired
    public GuestLimiter(@Value("${akven.guest.checkouts-per-hour:20}") int checkouts, @Value("${akven.guest.finds-per-hour:5}") int finds) {
        this(checkouts, finds, Clock.systemUTC());
    }

    GuestLimiter(int checkouts, int finds, Clock clock) {
        this.checkouts = checkouts;
        this.finds = finds;
        this.clock = clock;
    }

    public void checkout(String address) {
        hit("checkout:" + address, checkouts, "GUEST_TOO_MANY", "Too many orders from this connection in the last hour. Please wait a while, or sign in.");
    }

    public void find(String address) {
        hit("find:" + address, finds, "FIND_TOO_MANY", "You have asked for links several times. Please wait an hour, or write to the family.");
    }

    private void hit(String key, int limit, String code, String message) {
        Instant now = clock.instant();
        synchronized (this) {
            if (hits.size() > SWEEP_AT) hits.values().removeIf(d -> { trim(d, now); return d.isEmpty(); });
            Deque<Instant> mine = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
            trim(mine, now);
            if (mine.size() >= limit) throw new TooManyRequestsException(code, Map.of(), message);
            mine.addLast(now);
        }
    }

    private void trim(Deque<Instant> d, Instant now) {
        while (!d.isEmpty() && d.peekFirst().isBefore(now.minus(window))) d.pollFirst();
    }
}
