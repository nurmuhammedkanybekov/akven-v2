package com.akven.thesis.auth;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** One address can create only so many accounts an hour; other addresses are not affected. */
class RegistrationLimiterTest {

    @Test
    void stopsOneAddressAfterTheLimitAndLeavesOthersAlone() {
        RegistrationLimiter limiter = new RegistrationLimiter(2);
        limiter.recordRegistration("10.0.0.1");
        assertThat(limiter.secondsUntilAllowed("10.0.0.1")).isZero();
        limiter.recordRegistration("10.0.0.1");
        assertThat(limiter.secondsUntilAllowed("10.0.0.1")).isBetween(1L, 3600L);
        assertThat(limiter.secondsUntilAllowed("10.0.0.2")).isZero();
    }
}
