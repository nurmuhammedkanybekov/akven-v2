package com.akven.thesis.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    /** UC-9 — Admin listing staff/admin accounts by role. */
    List<User> findByRole(Role role);

    /** The shop team's accounts (everything but customers), for the accounts screen. */
    List<User> findByRoleInOrderByRoleDescEmailAsc(java.util.Collection<Role> roles);

    /** Customers whose email contains the search text, for marking trusted customers. */
    /** Customers whose email or name contains the text, the newest first. */
    @org.springframework.data.jpa.repository.Query("select u from User u where u.role = :role and (lower(u.email) like :text or lower(coalesce(u.displayName, '')) like :text) order by u.createdAt desc")
    org.springframework.data.domain.Page<User> searchByRole(@org.springframework.data.repository.query.Param("role") Role role,
                                                            @org.springframework.data.repository.query.Param("text") String text,
                                                            org.springframework.data.domain.Pageable page);

    org.springframework.data.domain.Page<User> findByRoleAndEmailContainingIgnoreCaseOrderByEmailAsc(Role role, String text, org.springframework.data.domain.Pageable page);

    boolean existsByRole(Role role);

    /** The demo accounts still switched on, to turn them off on a real installation. */
    List<User> findByEmailEndingWithAndActiveTrue(String suffix);

    List<User> findByEmailEndingWithAndActiveFalse(String domain);
}
