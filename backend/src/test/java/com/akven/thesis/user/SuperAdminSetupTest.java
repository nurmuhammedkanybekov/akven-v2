package com.akven.thesis.user;

import com.akven.thesis.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

/** A real installation gets its super admin from the environment, once, and only with a long password. */
class SuperAdminSetupTest extends IntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder encoder;

    @Test
    void createsTheAccountOnceAndNeverOverwritesIt() {
        new SuperAdminSetup(users, encoder, "Nur@Example.test", "a-very-long-password", "Nur").run(null);
        User nur = users.findByEmail("nur@example.test").orElseThrow();
        assertThat(nur.getRole()).isEqualTo(Role.SUPER_ADMIN);
        assertThat(nur.getDisplayName()).isEqualTo("Nur");
        assertThat(encoder.matches("a-very-long-password", nur.getPasswordHash())).isTrue();

        new SuperAdminSetup(users, encoder, "nur@example.test", "a-different-long-password", null).run(null);
        assertThat(encoder.matches("a-very-long-password", users.findByEmail("nur@example.test").orElseThrow().getPasswordHash())).isTrue();
    }

    @Test
    void aShortPasswordOrNothingSetCreatesNothing() {
        new SuperAdminSetup(users, encoder, "short@example.test", "too-short", null).run(null);
        new SuperAdminSetup(users, encoder, "", "", null).run(null);
        assertThat(users.findByEmail("short@example.test")).isEmpty();
    }
}
