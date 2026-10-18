package com.akven.thesis.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;

/**
 * Limits how many accounts one client address can create in an hour, so a script cannot fill the customer list.
 * The limit is generous because many shoppers at the bazaar share one mobile network address. Same sliding window as
 * the login protection, counted per address only.
 */
@Component
public class RegistrationLimiter {

    private final LoginAttemptService window;

    public RegistrationLimiter(@Value("${akven.auth.max-registrations-per-hour:30}") int maxPerHour) {
        this.window = new LoginAttemptService(maxPerHour, Duration.ofHours(1), Clock.systemUTC());
    }

    /** Seconds until this address may create another account, or 0 when it may now. */
    public long secondsUntilAllowed(String clientAddress) {
        return window.secondsUntilAllowed(clientAddress);
    }

    public void recordRegistration(String clientAddress) {
        window.recordFailure(clientAddress);
    }
}
