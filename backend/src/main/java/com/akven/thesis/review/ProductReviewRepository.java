package com.akven.thesis.review;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductReviewRepository extends JpaRepository<ProductReview, UUID> {

    Optional<ProductReview> findByProductIdAndUserId(UUID productId, UUID userId);

    List<ProductReview> findByProductIdAndStatusOrderByCreatedAtDesc(UUID productId, ReviewStatus status);

    List<ProductReview> findByStatusOrderByCreatedAtAsc(ReviewStatus status, Pageable page);

    @Query("select r from ProductReview r where r.status = com.akven.thesis.review.ReviewStatus.APPROVED and r.rating >= :min order by r.createdAt desc")
    List<ProductReview> findShowcase(@Param("min") int minRating, Pageable page);
}
