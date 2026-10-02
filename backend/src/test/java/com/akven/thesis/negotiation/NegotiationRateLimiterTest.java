package com.akven.thesis.negotiation;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NegotiationRateLimiterTest {

    private static final class MutableClock extends Clock {
        Instant now = Instant.parse("2026-10-02T10:00:00Z");
        @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    @Test
    void refusesAfterTheLimitAndRecoversWhenTheWindowPasses() {
        MutableClock clock = new MutableClock();
        NegotiationRateLimiter limiter = new NegotiationRateLimiter(3, Duration.ofMinutes(10), clock);
        for (int i = 0; i < 3; i++) limiter.check("a@x.test");
        assertThatThrownBy(() -> limiter.check("a@x.test")).isInstanceOf(TooManyRequestsException.class);
        assertThatCode(() -> limiter.check("b@x.test")).doesNotThrowAnyException();
        clock.now = clock.now.plus(Duration.ofMinutes(11));
        assertThatCode(() -> limiter.check("a@x.test")).doesNotThrowAnyException();
    }
}
