package com.akven.thesis.wholesale;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WholesaleRequestRepository extends JpaRepository<WholesaleRequest, UUID> {

    List<WholesaleRequest> findByStatusOrderByCreatedAtDesc(WholesaleStatus status, Pageable page);

    List<WholesaleRequest> findAllByOrderByCreatedAtDesc(Pageable page);

    long countByStatus(WholesaleStatus status);
}
