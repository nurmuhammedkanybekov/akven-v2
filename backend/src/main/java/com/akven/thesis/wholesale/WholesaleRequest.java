package com.akven.thesis.wholesale;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** One request from a shop, a reseller or a company, kept until the family has answered it. */
@Entity
@Table(name = "wholesale_request")
public class WholesaleRequest {

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private WholesaleKind kind;

    @Column(nullable = false, length = 80)
    private String company;

    @Column(length = 60)
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(name = "contact_kind", nullable = false, length = 10)
    private ContactKind contactKind;

    @Column(nullable = false, length = 80)
    private String contact;

    @Column(nullable = false)
    private int pairs;

    @Column(length = 1000)
    private String mix;

    @Column(length = 500)
    private String note;

    @Column(name = "account_email")
    private String accountEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private WholesaleStatus status = WholesaleStatus.NEW;

    @Column(name = "staff_note", length = 500)
    private String staffNote;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    protected WholesaleRequest() {
        // JPA
    }

    WholesaleRequest(WholesaleKind kind, String company, String city, ContactKind contactKind, String contact,
                     int pairs, String mix, String note, String accountEmail) {
        this.kind = kind;
        this.company = company;
        this.city = city;
        this.contactKind = contactKind;
        this.contact = contact;
        this.pairs = pairs;
        this.mix = mix;
        this.note = note;
        this.accountEmail = accountEmail;
    }

    void handle(WholesaleStatus status, String staffNote) {
        this.status = status;
        this.staffNote = staffNote;
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public WholesaleKind getKind() { return kind; }
    public String getCompany() { return company; }
    public String getCity() { return city; }
    public ContactKind getContactKind() { return contactKind; }
    public String getContact() { return contact; }
    public int getPairs() { return pairs; }
    public String getMix() { return mix; }
    public String getNote() { return note; }
    public String getAccountEmail() { return accountEmail; }
    public WholesaleStatus getStatus() { return status; }
    public String getStaffNote() { return staffNote; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
