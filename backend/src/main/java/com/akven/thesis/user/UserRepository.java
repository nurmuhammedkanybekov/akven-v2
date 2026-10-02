package com.akven.thesis.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    /** UC-9 — Admin listing staff/admin accounts by role. */
    List<User> findByRole(Role role);
}
