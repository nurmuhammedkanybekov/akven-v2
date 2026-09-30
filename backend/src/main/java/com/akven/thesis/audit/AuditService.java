package com.akven.thesis.audit;

import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.user.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Writes one append-only audit record per admin mutation (FR-13). It joins the
 * caller's transaction, so a change and its audit entry commit or roll back together:
 * there is never a price change without a trail, nor a trail for a change that failed.
 */
@Service
public class AuditService {

    private final AuditLogRepository repository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository repository, UserRepository userRepository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    /** before/after are plain snapshots (maps or records); null means "did not exist" / "no longer exists". */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(String actorEmail, String action, String entityType, UUID entityId,
                       Object before, Object after) {
        UUID actorId = userRepository.findByEmail(actorEmail)
                .orElseThrow(() -> new NotFoundException("Acting user no longer exists"))
                .getId();
        repository.save(new AuditLogEntry(actorId, action, entityType, entityId,
                toJson(before), toJson(after), UUID.randomUUID().toString()));
    }

    private String toJson(Object snapshot) {
        if (snapshot == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not serialise audit snapshot", e);
        }
    }
}
