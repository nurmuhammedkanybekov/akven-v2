package com.akven.thesis.delivery;

import com.akven.thesis.order.Country;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DeliveryZoneRepository extends JpaRepository<DeliveryZone, UUID> {

    List<DeliveryZone> findByActiveTrueOrderByCountryAscPositionAscNameAsc();

    List<DeliveryZone> findAllByOrderByCountryAscPositionAscNameAsc();

    List<DeliveryZone> findByCountryAndActiveTrueOrderByPositionAscNameAsc(Country country);
}
