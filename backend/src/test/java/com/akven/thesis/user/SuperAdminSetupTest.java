package com.akven.thesis.user;

import com.akven.thesis.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** A real installation gets its super admin from the environment, once, and only with a long password. */
class SuperAdminSetupTest extends IntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder encoder;

    @Test
    void createsTheAccountOnceAndNeverOverwritesIt() {
        new SuperAdminSetup(users, encoder, "Nur@Example.test", "a-very-long-password", "Nur", "on").run(null);
        User nur = users.findByEmail("nur@example.test").orElseThrow();
        assertThat(nur.getRole()).isEqualTo(Role.SUPER_ADMIN);
        assertThat(nur.getDisplayName()).isEqualTo("Nur");
        assertThat(encoder.matches("a-very-long-password", nur.getPasswordHash())).isTrue();

        new SuperAdminSetup(users, encoder, "nur@example.test", "a-different-long-password", null, "on").run(null);
        assertThat(encoder.matches("a-very-long-password", users.findByEmail("nur@example.test").orElseThrow().getPasswordHash())).isTrue();
    }

    @Test
    void aShortPasswordOrNothingSetCreatesNothing() {
        new SuperAdminSetup(users, encoder, "short@example.test", "too-short", null, "on").run(null);
        new SuperAdminSetup(users, encoder, "", "", null, "on").run(null);
        assertThat(users.findByEmail("short@example.test")).isEmpty();
    }

    @Test
    void onARealInstallationTheDemoAccountsAreSwitchedOffUnlessKept() {
        UserRepository repo = mock(UserRepository.class);
        User nur = new User("nur@example.test", "hash", Role.SUPER_ADMIN);
        User demoOwner = new User("admin@akven.test", "hash", Role.ADMIN);
        when(repo.findByEmail("nur@example.test")).thenReturn(Optional.of(nur));
        when(repo.findByEmailEndingWithAndActiveTrue("@akven.test")).thenReturn(List.of(demoOwner));

        new SuperAdminSetup(repo, encoder, "nur@example.test", "a-very-long-password", null, "on").run(null);
        assertThat(demoOwner.isActive()).isTrue();

        new SuperAdminSetup(repo, encoder, "nur@example.test", "a-very-long-password", null, "off").run(null);
        assertThat(demoOwner.isActive()).isFalse();
        assertThat(nur.isActive()).isTrue();
        verify(repo, never()).save(any());
    }

    @Test
    void withoutASuperAdminTheDemoAccountsStay() {
        UserRepository repo = mock(UserRepository.class);
        new SuperAdminSetup(repo, encoder, "", "", null, "off").run(null);
        verifyNoInteractions(repo);
    }
}
