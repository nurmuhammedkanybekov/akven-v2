package com.akven.thesis.negotiation;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface NegotiationSessionRepository extends JpaRepository<NegotiationSession, UUID> {

    /** UC-3 — a customer's own negotiation history. */
    List<NegotiationSession> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    /** UC-7 — Staff/Admin reviewing transcripts, proposed vs. validated discount, across all customers. */
    List<NegotiationSession> findAllByOrderByCreatedAtDesc();

    List<NegotiationSession> findByCreatedAtGreaterThanEqual(java.time.Instant since);

    Page<NegotiationSession> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
