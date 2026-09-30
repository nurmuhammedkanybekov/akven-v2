package com.akven.thesis.auth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Brute-force protection for login: after N failed attempts from one client address for one
 * account, further attempts are refused until the oldest failure ages out of the window.
 * Keyed on address AND account so a stranger cannot lock a customer out by typing their email.
 *
 * In-memory and per instance, which is correct for this deployment (one backend). Behind a
 * load balancer this would move to a shared store (Redis or the database).
 */
@Service
public class LoginAttemptService {

    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
    private final int maxFailures;
    private final Duration window;
    private final Clock clock;

    @Autowired
    public LoginAttemptService(@Value("${akven.auth.max-failed-logins:5}") int maxFailures,
                               @Value("${akven.auth.lockout-minutes:15}") long lockoutMinutes) {
        this(maxFailures, Duration.ofMinutes(lockoutMinutes), Clock.systemUTC());
    }

    LoginAttemptService(int maxFailures, Duration window, Clock clock) {
        this.maxFailures = maxFailures;
        this.window = window;
        this.clock = clock;
    }

    static String key(String clientAddress, String email) {
        return clientAddress + "|" + email;
    }

    /** Seconds until another attempt is allowed, or 0 when the client may try now. */
    public long secondsUntilAllowed(String key) {
        Deque<Instant> recent = prune(key);
        if (recent == null || recent.size() < maxFailures) {
            return 0;
        }
        Instant unlocksAt = recent.peekFirst().plus(window);
        return Math.max(1, Duration.between(clock.instant(), unlocksAt).toSeconds());
    }

    public void recordFailure(String key) {
        failures.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (failures.get(key)) {
            failures.get(key).addLast(clock.instant());
        }
    }

    public void recordSuccess(String key) {
        failures.remove(key);
    }

    private Deque<Instant> prune(String key) {
        Deque<Instant> recent = failures.get(key);
        if (recent == null) {
            return null;
        }
        synchronized (recent) {
            Instant cutoff = clock.instant().minus(window);
            while (!recent.isEmpty() && recent.peekFirst().isBefore(cutoff)) {
                recent.pollFirst();
            }
            if (recent.isEmpty()) {
                failures.remove(key);
                return null;
            }
            return recent;
        }
    }
}
