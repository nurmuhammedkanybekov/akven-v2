package com.akven.thesis.audit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLogEntry, UUID> {

    /** UC-8 — View audit log, scoped to one entity (e.g. one product's edit history). */
    List<AuditLogEntry> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, UUID entityId);

    /** Trace everything that happened under one request/correlation id. */
    List<AuditLogEntry> findByCorrelationId(String correlationId);
}
