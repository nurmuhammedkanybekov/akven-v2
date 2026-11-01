package com.akven.thesis.delivery;

import com.akven.thesis.order.Country;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

/** Where the shop delivers, for how much and how fast. Prices are in US dollars, like every price in the shop. */
@Entity
@Table(name = "delivery_zone")
public class DeliveryZone {

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 2)
    private Country country;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal fee = BigDecimal.ZERO;

    @Column(name = "free_from", precision = 12, scale = 2)
    private BigDecimal freeFrom;

    @Column(name = "days_min")
    private Integer daysMin;

    @Column(name = "days_max")
    private Integer daysMax;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false)
    private int position;

    protected DeliveryZone() {
        // JPA
    }

    DeliveryZone(Country country) {
        this.country = country;
    }

    void update(Country country, String name, BigDecimal fee, BigDecimal freeFrom, Integer daysMin, Integer daysMax, boolean active, int position) {
        this.country = country;
        this.name = name;
        this.fee = fee;
        this.freeFrom = freeFrom;
        this.daysMin = daysMin;
        this.daysMax = daysMax;
        this.active = active;
        this.position = position;
    }

    /** What delivering socks worth {@code itemsTotal} costs: nothing once the order reaches the free-from amount. */
    public BigDecimal feeFor(BigDecimal itemsTotal) {
        return freeFrom != null && itemsTotal.compareTo(freeFrom) >= 0 ? BigDecimal.ZERO : fee;
    }

    public UUID getId() { return id; }
    public Country getCountry() { return country; }
    public String getName() { return name; }
    public BigDecimal getFee() { return fee; }
    public BigDecimal getFreeFrom() { return freeFrom; }
    public Integer getDaysMin() { return daysMin; }
    public Integer getDaysMax() { return daysMax; }
    public boolean isActive() { return active; }
    public int getPosition() { return position; }
}
