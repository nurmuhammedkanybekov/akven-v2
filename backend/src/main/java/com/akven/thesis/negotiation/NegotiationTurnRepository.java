package com.akven.thesis.negotiation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface NegotiationTurnRepository extends JpaRepository<NegotiationTurn, UUID> {

    List<NegotiationTurn> findBySessionIdOrderByPositionAsc(UUID sessionId);

    /** How many answers each assistant gave since a moment: [assistant, count] rows, for the super admin's status. */
    @Query("select t.assistant, count(t) from NegotiationTurn t where t.createdAt >= :since group by t.assistant")
    List<Object[]> countByAssistantSince(Instant since);
}
