package com.akven.thesis.review;

import com.akven.thesis.review.ReviewDtos.ModerationInput;
import com.akven.thesis.review.ReviewDtos.ModerationLine;
import com.akven.thesis.review.ReviewDtos.MyReview;
import com.akven.thesis.review.ReviewDtos.ProductReviews;
import com.akven.thesis.review.ReviewDtos.ReviewInput;
import com.akven.thesis.review.ReviewDtos.ShowcaseReview;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Reviews: read them (public), write one (a verified buyer), and approve them (the shop team). */
@RestController
public class ReviewController {

    private final ReviewService service;

    public ReviewController(ReviewService service) {
        this.service = service;
    }

    @GetMapping("/api/products/{slug}/reviews")
    public ProductReviews forProduct(@PathVariable String slug) {
        return service.forProduct(slug);
    }

    @GetMapping("/api/catalog/reviews")
    public List<ShowcaseReview> showcase(@RequestParam(defaultValue = "6") int limit) {
        return service.showcase(limit);
    }

    @GetMapping("/api/reviews/{slug}/mine")
    public MyReview mine(Authentication auth, @PathVariable String slug) {
        return service.mine(auth.getName(), slug);
    }

    @PutMapping("/api/reviews/{slug}")
    public MyReview write(Authentication auth, @PathVariable String slug, @Valid @RequestBody ReviewInput input) {
        return service.write(auth.getName(), slug, input);
    }

    @GetMapping("/api/admin/reviews")
    public List<ModerationLine> waiting(@RequestParam(required = false) ReviewStatus status) {
        return service.waiting(status);
    }

    @PutMapping("/api/admin/reviews/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void moderate(Authentication auth, @PathVariable UUID id, @Valid @RequestBody ModerationInput input) {
        service.moderate(auth.getName(), id, input.status());
    }
}
