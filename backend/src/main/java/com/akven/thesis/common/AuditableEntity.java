package com.akven.thesis.common;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * Shared audit/concurrency columns for tables that see repeated updates
 * after creation (app_user, product, variant, customer_order).
 *
 * created_at/updated_at are set by Spring Data's auditing listener at the
 * application layer; the matching set_updated_at() trigger in V1__init_schema
 * is defense in depth so updated_at stays correct even for a row touched
 * outside this application. version backs JPA optimistic locking — the
 * concrete reason it's here is variant.stock_qty: two admins editing the
 * same SKU, or a stock update racing a checkout, should fail loudly
 * (OptimisticLockException) instead of silently losing one write.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AuditableEntity {

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version;

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Integer getVersion() {
        return version;
    }
}
