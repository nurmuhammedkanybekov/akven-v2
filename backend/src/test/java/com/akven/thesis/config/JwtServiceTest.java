package com.akven.thesis.config;

import com.akven.thesis.user.Role;
import com.akven.thesis.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The signing key is never a value from the repository: JWT_SECRET, or this installation's own random key. */
class JwtServiceTest {

    private static final String OLD_DEV_SECRET = "dev-only-insecure-secret-change-in-production-min-32-bytes!!";

    private static User user() {
        User u = new User("a@akven.test", "x", Role.CUSTOMER);
        ReflectionTestUtils.setField(u, "id", UUID.randomUUID());
        return u;
    }

    @Test
    void refusesTheOldPublicDevelopmentSecretEverywhere() {
        assertThatThrownBy(() -> new JwtService(OLD_DEV_SECRET, 60, () -> new byte[48]))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("public development value");
    }

    @Test
    void acceptsARealSecretAndRejectsAShortOne() {
        assertThatCode(() -> new JwtService("a-real-random-secret-with-more-than-32-bytes-1234", 60, () -> new byte[48]))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> new JwtService("too-short", 60, () -> new byte[48]))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("32 bytes");
    }

    @Test
    void withoutASecretItUsesTheInstallationsOwnKeyReadOnce() {
        AtomicInteger reads = new AtomicInteger();
        byte[] key = new byte[48];
        new java.security.SecureRandom().nextBytes(key);
        JwtService jwt = new JwtService("", 60, () -> { reads.incrementAndGet(); return key; });
        String token = jwt.generateToken(user());
        assertThat(jwt.parseClaims(token).getSubject()).isEqualTo("a@akven.test");
        jwt.generateToken(user());
        assertThat(reads.get()).isEqualTo(1);

        byte[] other = new byte[48];
        new java.security.SecureRandom().nextBytes(other);
        JwtService elsewhere = new JwtService("", 60, () -> other);
        assertThatThrownBy(() -> elsewhere.parseClaims(token)).as("another installation cannot read this token").isInstanceOf(RuntimeException.class);
    }
}
