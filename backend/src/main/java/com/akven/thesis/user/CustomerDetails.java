package com.akven.thesis.user;

import com.akven.thesis.order.Country;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** The contact and delivery details a customer asked the shop to remember for the next order. */
@Entity
@Table(name = "customer_details")
public class CustomerDetails {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "contact_name", length = 120)
    private String contactName;

    @Column(name = "contact_phone", length = 40)
    private String contactPhone;

    @Column(length = 300)
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(length = 2)
    private Country country;

    @Column(name = "zone_id")
    private UUID zoneId;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected CustomerDetails() {
        // JPA
    }

    CustomerDetails(UUID userId) {
        this.userId = userId;
    }

    void update(String contactName, String contactPhone, String address, Country country, UUID zoneId) {
        this.contactName = contactName;
        this.contactPhone = contactPhone;
        this.address = address;
        this.country = country;
        this.zoneId = zoneId;
        this.updatedAt = Instant.now();
    }

    public UUID getUserId() { return userId; }
    public String getContactName() { return contactName; }
    public String getContactPhone() { return contactPhone; }
    public String getAddress() { return address; }
    public Country getCountry() { return country; }
    public UUID getZoneId() { return zoneId; }
    public Instant getUpdatedAt() { return updatedAt; }
}
