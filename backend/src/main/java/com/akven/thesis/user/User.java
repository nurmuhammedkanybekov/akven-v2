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

    /**
     * Needed only by UserDetailsServiceImpl so Spring Security can verify a login attempt.
     * @JsonIgnore is defense in depth: no endpoint returns a User entity today, but if one
     * ever does, the hash must not go out with it.
     */
    @JsonIgnore
    public String getPasswordHash() { return passwordHash; }
}
