package com.akven.thesis.shop;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PickupPointRepository extends JpaRepository<PickupPoint, UUID> {

    List<PickupPoint> findAllByOrderByPositionAscNameAsc();

    List<PickupPoint> findByActiveTrueOrderByPositionAscNameAsc();
}
