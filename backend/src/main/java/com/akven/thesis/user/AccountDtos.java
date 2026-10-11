package com.akven.thesis.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

/** Shapes of the accounts API. A password is only ever sent in; no response carries one or its hash. */
public final class AccountDtos {

    private AccountDtos() {
    }

    /** role is STAFF or ADMIN (an owner); a super admin is only ever created from the environment. */
    public record CreateAccount(@Email @NotBlank @Size(max = 255) String email, @Size(max = 80) String displayName,
                                @NotNull Role role, @NotBlank @Size(min = 8, max = 100) String password) {}

    public record UpdateAccount(@Size(max = 80) String displayName, @NotNull Role role, @NotNull Boolean active) {}

    public record ResetPassword(@NotBlank @Size(min = 8, max = 100) String password) {}

    public record AccountView(UUID id, String email, String displayName, Role role, boolean active, Instant createdAt) {
        static AccountView of(User u) {
            return new AccountView(u.getId(), u.getEmail(), u.getDisplayName(), u.getRole(), u.isActive(), u.getCreatedAt());
        }
    }

    public record CustomerView(UUID id, String email, boolean trusted, boolean active, Instant createdAt) {
        static CustomerView of(User u) {
            return new CustomerView(u.getId(), u.getEmail(), u.isTrusted(), u.isActive(), u.getCreatedAt());
        }
    }

    /** One line of the audit log, with the actor's email instead of their id. before/after are JSON text. */
    public record AuditView(UUID id, Instant at, String actor, String action, String entityType, UUID entityId,
                            String before, String after) {}
}
