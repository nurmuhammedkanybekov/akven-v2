package com.akven.thesis.wholesale;

import com.akven.thesis.negotiation.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WholesaleRateLimiterTest {

    /** A clock the test moves by hand. */
    private static final class Hand extends Clock {
        Instant now = Instant.parse("2026-11-01T10:00:00Z");
        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    @Test
    void perAddressLimitOpensAgainAfterAnHour() {
        Hand clock = new Hand();
        WholesaleRateLimiter limiter = new WholesaleRateLimiter(2, 100, clock);
        limiter.check("a");
        limiter.check("a");
        assertThatThrownBy(() -> limiter.check("a")).isInstanceOf(TooManyRequestsException.class);
        assertThatCode(() -> limiter.check("b")).doesNotThrowAnyException();
        clock.now = clock.now.plus(Duration.ofMinutes(61));
        assertThatCode(() -> limiter.check("a")).doesNotThrowAnyException();
    }

    @Test
    void manyAddressesTogetherCannotFloodTheInbox() {
        WholesaleRateLimiter limiter = new WholesaleRateLimiter(5, 3, new Hand());
        limiter.check("a");
        limiter.check("b");
        limiter.check(null);
        assertThatThrownBy(() -> limiter.check("d")).isInstanceOf(TooManyRequestsException.class);
    }

    @Test
    void addressesWhoseHourPassedAreForgotten() {
        Hand clock = new Hand();
        WholesaleRateLimiter limiter = new WholesaleRateLimiter(5, Integer.MAX_VALUE, clock);
        for (int i = 0; i <= WholesaleRateLimiter.SWEEP_AT; i++) limiter.check("10.0." + (i / 250) + "." + (i % 250));
        clock.now = clock.now.plus(Duration.ofMinutes(61));
        limiter.check("fresh");
        org.assertj.core.api.Assertions.assertThat(limiter.remembered()).isLessThanOrEqualTo(3);
    }
}
