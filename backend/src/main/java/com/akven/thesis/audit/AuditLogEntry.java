package com.akven.thesis.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/**
 * One audit record per admin mutation (price/stock edits, etc). Pattern carried
 * over from the Nevis IAM & Audit Logging project — MDC correlation id included
 * so a request can be traced end to end in logs and here. Append-only by
 * convention: nothing in this codebase ever updates or deletes a row here.
 */
@Entity
@Table(name = "audit_log_entry")
@EntityListeners(AuditingEntityListener.class)
public class AuditLogEntry {

    @Id
    @GeneratedValue
    private UUID id;

    /**
     * FK-constrained to app_user(id) at the DB level, but deliberately not a
     * @ManyToOne here — writing an audit entry should never trigger (or
     * require) loading the full User entity.
     */
    @Column(nullable = false)
    private UUID actorId;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(nullable = false, length = 100)
    private String entityType;

    @Column(nullable = false)
    private UUID entityId;

    /** Must be valid JSON text (e.g. via ObjectMapper#writeValueAsString) — stored as jsonb, not text. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String beforeState;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String afterState;

    @Column(length = 64)
    private String correlationId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected AuditLogEntry() {
        // JPA
    }

    public AuditLogEntry(UUID actorId, String action, String entityType, UUID entityId,
                          String beforeState, String afterState, String correlationId) {
        this.actorId = actorId;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.beforeState = beforeState;
        this.afterState = afterState;
        this.correlationId = correlationId;
    }

    public UUID getId() { return id; }
    public UUID getActorId() { return actorId; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public UUID getEntityId() { return entityId; }
    public String getBeforeState() { return beforeState; }
    public String getAfterState() { return afterState; }
    public String getCorrelationId() { return correlationId; }
    public Instant getCreatedAt() { return createdAt; }
}
