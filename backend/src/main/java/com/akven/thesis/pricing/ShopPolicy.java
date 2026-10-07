package com.akven.thesis.pricing;

import com.akven.thesis.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** The owners' order rules. There is exactly one row (id 1); the database refuses a second one. */
@Entity
@Table(name = "shop_policy")
public class ShopPolicy extends AuditableEntity {

    public static final short ID = 1;

    @Id
    private Short id = ID;

    @Column(nullable = false)
    private Integer minOrderPairs = 1;

    @Column(nullable = false)
    private Integer trustedMinOrderPairs = 1;

    @Column(nullable = false)
    private Integer trustedAfterOrders = 3;

    protected ShopPolicy() {
        // JPA
    }

    /** No minimum: what the shop does until the owners set one (and what a fresh test database has). */
    static ShopPolicy defaults() {
        return new ShopPolicy();
    }

    void update(int minOrderPairs, int trustedMinOrderPairs, int trustedAfterOrders) {
        this.minOrderPairs = minOrderPairs;
        this.trustedMinOrderPairs = trustedMinOrderPairs;
        this.trustedAfterOrders = trustedAfterOrders;
    }

    public int getMinOrderPairs() { return minOrderPairs; }
    public int getTrustedMinOrderPairs() { return trustedMinOrderPairs; }
    public int getTrustedAfterOrders() { return trustedAfterOrders; }
}
