package com.akven.thesis.order;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {

    /** True when a negotiated offer has already been used by an order line. */
    boolean existsByNegotiationSessionId(UUID negotiationSessionId);
}
