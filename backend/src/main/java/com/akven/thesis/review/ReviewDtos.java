package com.akven.thesis.review;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Reviews as the shop shows them. No email, no account id: only the first name the customer chose to show. */
public final class ReviewDtos {

    private ReviewDtos() {
    }

    public record ReviewInput(@NotNull @Min(1) @Max(5) Integer rating,
                              @Size(max = 40) @Pattern(regexp = "[\\p{L}\\p{M} .'’-]*", message = "letters and spaces only") String author,
                              @NotBlank @Size(min = 10, max = 1000) String body) {}

    public record ReviewView(UUID id, int rating, String author, String body, Instant createdAt) {
        static ReviewView of(ProductReview r) {
            return new ReviewView(r.getId(), r.getRating(), r.getAuthor(), r.getBody(), r.getCreatedAt());
        }
    }

    /** counts[0] is how many gave 1 star ... counts[4] five stars. */
    public record ProductReviews(int count, Double average, int[] counts, List<ReviewView> reviews) {}

    /** Whether this customer may write (a handed-over order with the sock), and what they wrote before. */
    public record MyReview(boolean canReview, ReviewStatus status, Integer rating, String author, String body) {}

    public record ShowcaseReview(UUID id, int rating, String author, String body, Instant createdAt, String productSlug, String productName) {}

    public record ModerationLine(UUID id, int rating, String author, String body, Instant createdAt, ReviewStatus status,
                                 String productSlug, String productName, String customerEmail) {}

    public record ModerationInput(@NotNull ReviewStatus status) {}
}
