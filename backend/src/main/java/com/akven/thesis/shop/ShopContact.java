package com.akven.thesis.shop;

import com.akven.thesis.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** One way to reach the shop (Instagram, Telegram, WhatsApp, phone, email), entered by the owners. */
@Entity
@Table(name = "shop_contact")
public class ShopContact extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ContactKind kind;

    @Column(length = 80)
    private String label;

    @Column(name = "contact_value", nullable = false, length = 120)
    private String value;

    @Column(nullable = false)
    private Integer position = 0;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    protected ShopContact() {
        // JPA
    }

    ShopContact(ContactKind kind, String label, String value, int position, boolean active) {
        update(kind, label, value, position, active);
    }

    void update(ContactKind kind, String label, String value, int position, boolean active) {
        this.kind = kind;
        this.label = label;
        this.value = value;
        this.position = position;
        this.active = active;
    }

    public UUID getId() { return id; }
    public ContactKind getKind() { return kind; }
    public String getLabel() { return label; }
    public String getValue() { return value; }
    public int getPosition() { return position; }
    public boolean isActive() { return active; }
}
