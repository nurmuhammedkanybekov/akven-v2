package com.akven.thesis.review;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.catalog.Product;
import com.akven.thesis.catalog.ProductRepository;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.review.ReviewDtos.ModerationLine;
import com.akven.thesis.review.ReviewDtos.MyReview;
import com.akven.thesis.review.ReviewDtos.ProductReviews;
import com.akven.thesis.review.ReviewDtos.ReviewInput;
import com.akven.thesis.review.ReviewDtos.ReviewView;
import com.akven.thesis.review.ReviewDtos.ShowcaseReview;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Reviews from verified buyers. Only a customer whose order with the sock was handed over may write one, once per sock;
 * the owners approve it before anyone sees it, and writing again sends it back for approval. The shop shows a first
 * name the customer chose, never an email. Text is kept as plain text and shown as text.
 */
@Service
public class ReviewService {

    /** How many reviews a product page lists. */
    static final int SHOWN = 30;

    private final ProductReviewRepository reviews;
    private final ProductRepository products;
    private final UserRepository users;
    private final EntityManager em;
    private final AuditService audit;

    public ReviewService(ProductReviewRepository reviews, ProductRepository products, UserRepository users, EntityManager em, AuditService audit) {
        this.reviews = reviews;
        this.products = products;
        this.users = users;
        this.em = em;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public ProductReviews forProduct(String slug) {
        List<ProductReview> shown = reviews.findByProductIdAndStatusOrderByCreatedAtDesc(product(slug).getId(), ReviewStatus.APPROVED);
        int[] counts = new int[5];
        shown.forEach(r -> counts[r.getRating() - 1]++);
        Double average = shown.isEmpty() ? null
                : Math.round(shown.stream().mapToInt(ProductReview::getRating).average().orElse(0) * 10) / 10.0;
        return new ProductReviews(shown.size(), average, counts, shown.stream().limit(SHOWN).map(ReviewView::of).toList());
    }

    @Transactional(readOnly = true)
    public MyReview mine(String email, String slug) {
        Product p = product(slug);
        User u = user(email);
        boolean bought = received(u.getId(), p.getId());
        return reviews.findByProductIdAndUserId(p.getId(), u.getId())
                .map(r -> new MyReview(bought, r.getStatus(), r.getRating(), r.getAuthor(), r.getBody()))
                .orElse(new MyReview(bought, null, null, null, null));
    }

    @Transactional
    public MyReview write(String email, String slug, ReviewInput in) {
        Product p = product(slug);
        User u = user(email);
        if (!received(u.getId(), p.getId())) {
            throw new BusinessRuleException("Reviews are written by customers who have received this sock.");
        }
        String body = in.body().replace("\r\n", "\n").replaceAll("[\\p{Cc}&&[^\n]]", "").replaceAll("\n{3,}", "\n\n").strip();
        if (body.length() < 10) throw new BusinessRuleException("Write a few more words (at least 10 characters).");
        String author = in.author() == null || in.author().isBlank() ? null : in.author().strip().replaceAll("\\s+", " ");
        ProductReview r = reviews.findByProductIdAndUserId(p.getId(), u.getId()).orElseGet(() -> new ProductReview(p.getId(), u.getId()));
        r.write(in.rating(), author, body);
        reviews.save(r);
        return new MyReview(true, r.getStatus(), r.getRating(), r.getAuthor(), r.getBody());
    }

    /** Good words for the home page: approved, four stars or more, newest first. */
    @Transactional(readOnly = true)
    public List<ShowcaseReview> showcase(int limit) {
        List<ProductReview> list = reviews.findShowcase(4, PageRequest.of(0, Math.max(1, Math.min(limit, 12))));
        Map<UUID, Product> byId = products.findAllById(list.stream().map(ProductReview::getProductId).distinct().toList()).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
        return list.stream().filter(r -> byId.containsKey(r.getProductId()) && byId.get(r.getProductId()).isActive())
                .map(r -> new ShowcaseReview(r.getId(), r.getRating(), r.getAuthor(), r.getBody(), r.getCreatedAt(),
                        byId.get(r.getProductId()).getSlug(), byId.get(r.getProductId()).getName()))
                .toList();
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional(readOnly = true)
    public List<ModerationLine> waiting(ReviewStatus status) {
        List<ProductReview> list = reviews.findByStatusOrderByCreatedAtAsc(status == null ? ReviewStatus.PENDING : status, PageRequest.of(0, 100));
        Map<UUID, Product> byProduct = products.findAllById(list.stream().map(ProductReview::getProductId).distinct().toList()).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
        Map<UUID, String> emails = users.findAllById(list.stream().map(ProductReview::getUserId).distinct().toList()).stream()
                .collect(Collectors.toMap(User::getId, User::getEmail));
        return list.stream().map(r -> {
            Product p = byProduct.get(r.getProductId());
            return new ModerationLine(r.getId(), r.getRating(), r.getAuthor(), r.getBody(), r.getCreatedAt(), r.getStatus(),
                    p == null ? null : p.getSlug(), p == null ? "?" : p.getName(), emails.getOrDefault(r.getUserId(), "?"));
        }).toList();
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional
    public void moderate(String actorEmail, UUID id, ReviewStatus status) {
        if (status == ReviewStatus.PENDING) throw new BusinessRuleException("Approve or reject the review.");
        ProductReview r = reviews.findById(id).orElseThrow(() -> new NotFoundException("No such review."));
        ReviewStatus before = r.getStatus();
        r.moderate(status);
        audit.record(actorEmail, "REVIEW_" + status.name(), "REVIEW", id, Map.of("status", before), Map.of("status", status, "rating", r.getRating()));
    }

    /** True when an order of this customer with this sock was handed over (the sock reached them). */
    private boolean received(UUID userId, UUID productId) {
        Long n = em.createQuery("""
                select count(i) from OrderItem i join i.order o join i.variant v
                where o.customer.id = :u and v.product.id = :p and o.status = com.akven.thesis.order.OrderStatus.FULFILLED""", Long.class)
                .setParameter("u", userId).setParameter("p", productId).getSingleResult();
        return n > 0;
    }

    private Product product(String slug) {
        return products.findBySlugAndActiveTrue(slug).orElseThrow(() -> new NotFoundException("Product not found."));
    }

    private User user(String email) {
        return users.findByEmail(email).orElseThrow(() -> new NotFoundException("Account not found."));
    }
}
