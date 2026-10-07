package com.akven.thesis.sizes;

import com.akven.thesis.common.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

/** One sock size with its foot length and the matching shoe sizes in each system. */
@Entity
@Table(name = "size_chart_row")
public class SizeChartRow extends AuditableEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true, length = 40) private String label;
    @Column(nullable = false, precision = 4, scale = 1) private BigDecimal footCmMin;
    @Column(nullable = false, precision = 4, scale = 1) private BigDecimal footCmMax;
    @Column(nullable = false) private Integer krMmMin;
    @Column(nullable = false) private Integer krMmMax;
    @Column(nullable = false, precision = 4, scale = 1) private BigDecimal localMin;
    @Column(nullable = false, precision = 4, scale = 1) private BigDecimal localMax;
    @Column(nullable = false, precision = 4, scale = 1) private BigDecimal euMin;
    @Column(nullable = false, precision = 4, scale = 1) private BigDecimal euMax;
    @Column(nullable = false, length = 40) private String usLabel;
    @Column(nullable = false) private Integer position = 0;

    protected SizeChartRow() {
        // JPA
    }

    SizeChartRow(SizeDtos.RowRequest r) {
        update(r);
    }

    void update(SizeDtos.RowRequest r) {
        this.label = r.label().trim();
        this.footCmMin = r.footCmMin();
        this.footCmMax = r.footCmMax();
        this.krMmMin = r.krMmMin();
        this.krMmMax = r.krMmMax();
        this.localMin = r.localMin();
        this.localMax = r.localMax();
        this.euMin = r.euMin();
        this.euMax = r.euMax();
        this.usLabel = r.usLabel().trim();
        this.position = r.position() == null ? 0 : r.position();
    }

    /** True when a shoe size in the given system falls in this row (both ends included). */
    boolean fits(SizeSystem system, BigDecimal size) {
        return switch (system) {
            case FOOT_CM -> between(size, footCmMin, footCmMax);
            case KR_MM -> between(size, BigDecimal.valueOf(krMmMin), BigDecimal.valueOf(krMmMax));
            case LOCAL -> between(size, localMin, localMax);
            case EU -> between(size, euMin, euMax);
        };
    }

    private static boolean between(BigDecimal v, BigDecimal min, BigDecimal max) {
        return v.compareTo(min) >= 0 && v.compareTo(max) <= 0;
    }

    public UUID getId() { return id; }
    public String getLabel() { return label; }
    public BigDecimal getFootCmMin() { return footCmMin; }
    public BigDecimal getFootCmMax() { return footCmMax; }
    public int getKrMmMin() { return krMmMin; }
    public int getKrMmMax() { return krMmMax; }
    public BigDecimal getLocalMin() { return localMin; }
    public BigDecimal getLocalMax() { return localMax; }
    public BigDecimal getEuMin() { return euMin; }
    public BigDecimal getEuMax() { return euMax; }
    public String getUsLabel() { return usLabel; }
    public int getPosition() { return position; }
}
