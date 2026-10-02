package com.akven.thesis.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String DEV_SECRET = "dev-only-insecure-secret-change-in-production-min-32-bytes!!";

    @Test
    void refusesTheBuiltInDevSecretUnlessDevelopmentIsExplicit() {
        assertThatThrownBy(() -> new JwtService(DEV_SECRET, 60, false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
        assertThatCode(() -> new JwtService(DEV_SECRET, 60, true)).doesNotThrowAnyException();
    }

    @Test
    void acceptsARealSecretAndRejectsAShortOne() {
        assertThatCode(() -> new JwtService("a-real-random-secret-with-more-than-32-bytes-1234", 60, false))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> new JwtService("too-short", 60, false)).isInstanceOf(RuntimeException.class);
    }
}
