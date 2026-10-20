package com.akven.thesis.saved;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SavedItemRepository extends JpaRepository<SavedItem, UUID> {

    List<SavedItem> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<SavedItem> findByUserIdAndProductId(UUID userId, UUID productId);

    long countByUserId(UUID userId);
}
