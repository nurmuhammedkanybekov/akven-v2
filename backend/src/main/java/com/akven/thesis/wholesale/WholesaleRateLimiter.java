package com.akven.thesis.wholesale;

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
 * The request form needs no account, so it is limited twice in a sliding hour: per visitor address (a person sends a
 * few at most) and for the whole shop (so that many addresses together cannot bury the family's inbox). In memory and
 * per instance, like the other limiters.
 */
@Component
public class WholesaleRateLimiter {

    static final String EVERYONE = "*";

    private final Map<String, Deque<Instant>> hits = new ConcurrentHashMap<>();
    private final int perAddress;
    private final int overall;
    private final Duration window = Duration.ofHours(1);
    private final Clock clock;

    @Autowired
    public WholesaleRateLimiter(@Value("${akven.wholesale.per-address-per-hour:5}") int perAddress,
                                @Value("${akven.wholesale.per-hour:60}") int overall) {
        this(perAddress, overall, Clock.systemUTC());
    }

    WholesaleRateLimiter(int perAddress, int overall, Clock clock) {
        this.perAddress = perAddress;
        this.overall = overall;
        this.clock = clock;
    }

    /** @throws TooManyRequestsException when this address, or everyone together, has used up the hour. */
    public void check(String address) {
        Instant now = clock.instant();
        Deque<Instant> mine = hits.computeIfAbsent(address == null ? "?" : address, k -> new ArrayDeque<>());
        Deque<Instant> all = hits.computeIfAbsent(EVERYONE, k -> new ArrayDeque<>());
        synchronized (this) {
            trim(mine, now);
            trim(all, now);
            if (mine.size() >= perAddress) {
                throw new TooManyRequestsException("You have sent several requests already. The family will answer them; please wait an hour before sending more.");
            }
            if (all.size() >= overall) {
                throw new TooManyRequestsException("The shop is receiving many requests right now. Please try again in a little while, or write to the family directly.");
            }
            mine.addLast(now);
            all.addLast(now);
        }
    }

    private void trim(Deque<Instant> q, Instant now) {
        while (!q.isEmpty() && q.peekFirst().isBefore(now.minus(window))) q.pollFirst();
    }
}
