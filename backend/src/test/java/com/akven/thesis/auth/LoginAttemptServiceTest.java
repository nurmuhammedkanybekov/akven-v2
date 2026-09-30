package com.akven.thesis.auth;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class LoginAttemptServiceTest {

    /** A clock the test can move forward. */
    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-10-01T10:00:00Z");
        @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    @Test
    void blocksAfterTheLimitAndReportsHowLongToWait() {
        MutableClock clock = new MutableClock();
        LoginAttemptService service = new LoginAttemptService(3, Duration.ofMinutes(15), clock);
        String key = LoginAttemptService.key("1.2.3.4", "a@b.c");

        for (int i = 0; i < 2; i++) service.recordFailure(key);
        assertThat(service.secondsUntilAllowed(key)).isZero();        // 2 of 3: still allowed
        service.recordFailure(key);
        assertThat(service.secondsUntilAllowed(key)).isEqualTo(15 * 60);

        clock.now = clock.now.plusSeconds(10 * 60);
        assertThat(service.secondsUntilAllowed(key)).isEqualTo(5 * 60);
    }

    @Test
    void failuresAgeOutOfTheWindow() {
        MutableClock clock = new MutableClock();
        LoginAttemptService service = new LoginAttemptService(2, Duration.ofMinutes(15), clock);
        String key = LoginAttemptService.key("1.2.3.4", "a@b.c");
        service.recordFailure(key);
        service.recordFailure(key);
        assertThat(service.secondsUntilAllowed(key)).isPositive();

        clock.now = clock.now.plus(Duration.ofMinutes(16));
        assertThat(service.secondsUntilAllowed(key)).isZero();
    }

    @Test
    void successClearsTheCounterAndKeysAreIndependent() {
        LoginAttemptService service = new LoginAttemptService(1, Duration.ofMinutes(15), new MutableClock());
        String mine = LoginAttemptService.key("1.2.3.4", "me@b.c");
        String other = LoginAttemptService.key("9.9.9.9", "me@b.c");
        service.recordFailure(mine);
        assertThat(service.secondsUntilAllowed(mine)).isPositive();
        assertThat(service.secondsUntilAllowed(other)).isZero();   // a stranger's attempts cannot lock me out

        service.recordSuccess(mine);
        assertThat(service.secondsUntilAllowed(mine)).isZero();
    }
}
