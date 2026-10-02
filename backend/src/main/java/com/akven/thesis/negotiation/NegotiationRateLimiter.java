package com.akven.thesis.negotiation;

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
 * Sliding-window limit on chat messages per signed-in customer. Each message costs one model call in production, so
 * an unlimited chat is both a cost risk and a way to probe for the best price. In memory and per instance, like the
 * login limiter.
 */
@Component
public class NegotiationRateLimiter {

    private final Map<String, Deque<Instant>> hits = new ConcurrentHashMap<>();
    private final int max;
    private final Duration window;
    private final Clock clock;

    @Autowired
    public NegotiationRateLimiter(@Value("${akven.negotiation.max-messages:20}") int max,
                                  @Value("${akven.negotiation.window-minutes:10}") long windowMinutes) {
        this(max, Duration.ofMinutes(windowMinutes), Clock.systemUTC());
    }

    NegotiationRateLimiter(int max, Duration window, Clock clock) {
        this.max = max;
        this.window = window;
        this.clock = clock;
    }

    /** @throws TooManyRequestsException when this person has used up the window. */
    public void check(String who) {
        Instant now = clock.instant();
        Deque<Instant> q = hits.computeIfAbsent(who, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && q.peekFirst().isBefore(now.minus(window))) q.pollFirst();
            if (q.size() >= max) {
                throw new TooManyRequestsException("You are sending messages very fast. Please wait a few minutes and try again.");
            }
            q.addLast(now);
        }
    }
}
