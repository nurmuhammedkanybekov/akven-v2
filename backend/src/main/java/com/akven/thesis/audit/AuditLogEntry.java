package com.akven.thesis.audit;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * One audit record per admin mutation (price/stock edits, etc). Pattern carried
 * over from the Nevis IAM & Audit Logging project — MDC correlation id included
 * so a request can be traced end to end in logs and here.
 */
@Entity
@Table(name = "audit_log_entry")
public class AuditLogEntry {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID actorId;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(nullable = false, length = 100)
    private String entityType;

    @Column(nullable = false)
    private UUID entityId;

    @Column(columnDefinition = "text")
    private String beforeState;

    @Column(columnDefinition = "text")
    private String afterState;

    @Column(length = 64)
    private String correlationId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

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
}
