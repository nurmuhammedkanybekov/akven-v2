package com.akven.thesis.notify;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface OutboundEmailRepository extends JpaRepository<OutboundEmail, UUID> {

    List<OutboundEmail> findTop20ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(EmailStatus status, Instant now);

    Page<OutboundEmail> findAllByOrderByCreatedAtDesc(Pageable page);

    Page<OutboundEmail> findByStatusOrderByCreatedAtDesc(EmailStatus status, Pageable page);

    List<OutboundEmail> findByOrderIdOrderByCreatedAtAsc(UUID orderId);

    long countByStatus(EmailStatus status);

    @Modifying
    @Query("delete from OutboundEmail e where e.createdAt < :before")
    int deleteOlderThan(@Param("before") Instant before);
}
