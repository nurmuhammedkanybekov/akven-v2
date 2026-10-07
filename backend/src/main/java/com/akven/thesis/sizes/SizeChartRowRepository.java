package com.akven.thesis.sizes;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SizeChartRowRepository extends JpaRepository<SizeChartRow, UUID> {

    List<SizeChartRow> findAllByOrderByPositionAscLabelAsc();

    Optional<SizeChartRow> findByLabelIgnoreCase(String label);
}
