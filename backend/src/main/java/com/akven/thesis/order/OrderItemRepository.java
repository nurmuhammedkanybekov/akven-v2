package com.akven.thesis.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {

    /** True when a negotiated offer has already been used by an order line. */
    boolean existsByNegotiationSessionId(UUID negotiationSessionId);

    /** Lines of paid (or handed-over) orders since a moment, with their order and variant loaded. */
    @Query("select i from OrderItem i join fetch i.order o join fetch i.variant v "
            + "where o.status in :statuses and o.paidAt >= :since")
    List<OrderItem> findSoldSince(@Param("statuses") Collection<OrderStatus> statuses,
                                      @Param("since") Instant since);
}
