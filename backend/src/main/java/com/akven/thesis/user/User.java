package com.akven.thesis.user;

import com.akven.thesis.common.AuditableEntity;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_user")
public class User extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Email
    @NotBlank
    @Column(nullable = false, unique = true)
    private String email;

    @NotBlank
    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    /** Set by an owner: this customer may order from the lower trusted minimum. */
    @Column(nullable = false)
    private boolean trusted = false;

    /** The name the shop team sees in the admin, such as "Akylbek". Optional. */
    @Column(name = "display_name", length = 80)
    private String displayName;

    /** Tokens issued before this moment are refused: set by a password reset and by disabling the account. */
    @Column(name = "credentials_changed_at")
    private Instant credentialsChangedAt;

    protected User() {
        // JPA
    }

    public User(String email, String passwordHash, Role role) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public Role getRole() { return role; }
    public boolean isActive() { return active; }
    public boolean isTrusted() { return trusted; }
    public void setTrusted(boolean trusted) { this.trusted = trusted; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public void setRole(Role role) { this.role = role; }
    public Instant getCredentialsChangedAt() { return credentialsChangedAt; }

    /** Disabling also ends the sessions the account already has. */
    public void setActive(boolean active) {
        if (this.active && !active) this.credentialsChangedAt = Instant.now();
        this.active = active;
    }

    /** A new password ends every session signed in with the old one. */
    public void changePassword(String newHash) {
        this.passwordHash = newHash;
        this.credentialsChangedAt = Instant.now();
    }

    /**
     * Needed only by UserDetailsServiceImpl so Spring Security can verify a login attempt.
     * @JsonIgnore is defense in depth: no endpoint returns a User entity today, but if one
     * ever does, the hash must not go out with it.
     */
    @JsonIgnore
    public String getPasswordHash() { return passwordHash; }
}
