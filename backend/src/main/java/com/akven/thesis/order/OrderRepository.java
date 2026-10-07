package com.akven.thesis.order;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID>, JpaSpecificationExecutor<Order> {

    long countByCustomerIdAndStatusIn(UUID customerId, java.util.Collection<OrderStatus> statuses);


    List<Order> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);

    List<Order> findByStatus(OrderStatus status);

    Optional<Order> findByCustomerIdAndIdempotencyKey(UUID customerId, String idempotencyKey);

    /** Locks the order row, so two cancellations (or a cancel and a fulfil) of the same order are serialised. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> lockById(@Param("id") UUID id);
}
