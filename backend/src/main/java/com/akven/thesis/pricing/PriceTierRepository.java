package com.akven.thesis.pricing;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PriceTierRepository extends JpaRepository<PriceTier, UUID> {

    List<PriceTier> findAllByOrderByMinPairsAsc();

    Optional<PriceTier> findByMinPairs(int minPairs);
}
