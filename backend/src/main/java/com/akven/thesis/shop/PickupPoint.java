package com.akven.thesis.shop;

import com.akven.thesis.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Where customers collect their orders, e.g. Dordoi Bazaar, Dordoi-Junhai, passage 8, container 70-E. */
@Entity
@Table(name = "pickup_point")
public class PickupPoint extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 120) private String name;
    @Column(nullable = false, length = 120) private String market;
    @Column(length = 120) private String section;
    @Column(length = 40) private String passage;
    @Column(nullable = false, length = 40) private String container;
    @Column(nullable = false, length = 80) private String city = "Bishkek";
    @Column(length = 200) private String hours;
    @Column(length = 1000) private String directions;
    @Column(nullable = false) private Integer position = 0;
    @Column(name = "is_active", nullable = false) private boolean active = true;

    protected PickupPoint() {
        // JPA
    }

    public PickupPoint(String name, String market, String section, String passage, String container, String city,
                       String hours, String directions, int position, boolean active) {
        update(name, market, section, passage, container, city, hours, directions, position, active);
    }

    void update(String name, String market, String section, String passage, String container, String city,
                String hours, String directions, int position, boolean active) {
        this.name = name;
        this.market = market;
        this.section = section;
        this.passage = passage;
        this.container = container;
        this.city = city == null || city.isBlank() ? "Bishkek" : city;
        this.hours = hours;
        this.directions = directions;
        this.position = position;
        this.active = active;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getMarket() { return market; }
    public String getSection() { return section; }
    public String getPassage() { return passage; }
    public String getContainer() { return container; }
    public String getCity() { return city; }
    public String getHours() { return hours; }
    public String getDirections() { return directions; }
    public int getPosition() { return position; }
    public boolean isActive() { return active; }
}
