package com.akven.thesis.family;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** One person a customer buys socks for: who they are, their shoe size, how many pairs they usually take. */
@Entity
@Table(name = "family_member")
public class FamilyMember {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private short position;

    @Column(length = 40)
    private String name;

    @Column(nullable = false, length = 16)
    private String role;

    @Column(name = "shoe_size", nullable = false)
    private short shoeSize;

    @Column(nullable = false)
    private short pairs;

    private LocalDate birthday;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected FamilyMember() {
        // JPA
    }

    FamilyMember(UUID userId, int position, String name, String role, int shoeSize, int pairs, LocalDate birthday) {
        this.userId = userId;
        this.position = (short) position;
        this.name = name;
        this.role = role;
        this.shoeSize = (short) shoeSize;
        this.pairs = (short) pairs;
        this.birthday = birthday;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public int getPosition() { return position; }
    public String getName() { return name; }
    public String getRole() { return role; }
    public int getShoeSize() { return shoeSize; }
    public int getPairs() { return pairs; }
    public LocalDate getBirthday() { return birthday; }
}
