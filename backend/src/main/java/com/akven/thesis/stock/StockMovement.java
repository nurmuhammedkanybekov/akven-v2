package com.akven.thesis.stock;

import com.akven.thesis.catalog.Variant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * One change to one variant's stock. Rows are only ever added, never edited or deleted: the ledger is the history,
 * and the variant's stock_qty is its running total (checked by StockLedgerTest).
 */
@Entity
@Table(name = "stock_movement")
public class StockMovement {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "variant_id")
    private Variant variant;

    @Column(nullable = false)
    private int delta;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private StockReason reason;

    @Column(name = "stock_after", nullable = false)
    private int stockAfter;

    @Column(name = "order_id")
    private UUID orderId;

    @Column(length = 255)
    private String actor;

    @Column(length = 200)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected StockMovement() {}

    StockMovement(Variant variant, int delta, StockReason reason, UUID orderId, String actor, String note) {
        this.variant = variant;
        this.delta = delta;
        this.reason = reason;
        this.stockAfter = variant.getStockQty();
        this.orderId = orderId;
        this.actor = actor;
        this.note = note;
    }

    public UUID getId() { return id; }
    public Variant getVariant() { return variant; }
    public int getDelta() { return delta; }
    public StockReason getReason() { return reason; }
    public int getStockAfter() { return stockAfter; }
    public UUID getOrderId() { return orderId; }
    public String getActor() { return actor; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
