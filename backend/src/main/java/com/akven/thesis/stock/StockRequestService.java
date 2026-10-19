package com.akven.thesis.stock;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.catalog.VariantRepository;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * "Tell me when it is back": a signed-in customer asks to hear when a sold-out option returns, and the owners see who
 * is waiting for what, with the customer's email, so they can write when the stock arrives (and know what to reorder
 * from Korea). Nothing is sent automatically; the owners mark a request as answered once they have written.
 */
@Service
public class StockRequestService {

    /** Enough for a family's wishes; a bot cannot fill the owners' list with thousands of rows. */
    static final int MAX_OPEN = 30;

    private final StockRequestRepository requests;
    private final VariantRepository variants;
    private final UserRepository users;
    private final AuditService audit;

    public StockRequestService(StockRequestRepository requests, VariantRepository variants, UserRepository users, AuditService audit) {
        this.requests = requests;
        this.variants = variants;
        this.users = users;
        this.audit = audit;
    }

    public record Waiter(UUID requestId, String email, Instant since) {}

    /** One sold-out option and everyone waiting for it, the longest wait first. */
    public record Waiting(String sku, String productName, String productSlug, String color, String size, int available,
                          int incoming, LocalDate restockEta, List<Waiter> customers) {}

    @Transactional
    public List<String> request(String email, String sku) {
        User user = user(email);
        Variant variant = variants.findBySku(sku).filter(v -> v.isActive() && v.getProduct().isActive())
                .orElseThrow(() -> new NotFoundException("No such option."));
        if (variant.available() > 0) throw new BusinessRuleException("This option is in stock: it can go in the bag now.");
        Optional<StockRequest> earlier = requests.findByVariantIdAndUserId(variant.getId(), user.getId());
        if (earlier.isEmpty() && requests.countByUserIdAndNotifiedAtIsNull(user.getId()) >= MAX_OPEN) {
            throw new BusinessRuleException("You are already waiting for " + MAX_OPEN + " options. Remove one you no longer need first.");
        }
        earlier.ifPresentOrElse(StockRequest::reopen, () -> requests.save(new StockRequest(variant.getId(), user.getId())));
        return mine(user);
    }

    @Transactional
    public List<String> cancel(String email, String sku) {
        User user = user(email);
        variants.findBySku(sku).flatMap(v -> requests.findByVariantIdAndUserId(v.getId(), user.getId())).ifPresent(requests::delete);
        return mine(user);
    }

    /** The SKUs this customer is waiting for. */
    @Transactional(readOnly = true)
    public List<String> mine(String email) {
        return mine(user(email));
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional(readOnly = true)
    public List<Waiting> waiting() {
        List<StockRequest> open = requests.findByNotifiedAtIsNullOrderByCreatedAtAsc();
        if (open.isEmpty()) return List.of();
        Map<UUID, Variant> byId = variants.findAllById(open.stream().map(StockRequest::getVariantId).distinct().toList()).stream()
                .collect(Collectors.toMap(Variant::getId, Function.identity()));
        Map<UUID, String> emails = users.findAllById(open.stream().map(StockRequest::getUserId).distinct().toList()).stream()
                .collect(Collectors.toMap(User::getId, User::getEmail));
        Map<UUID, List<StockRequest>> grouped = open.stream()
                .collect(Collectors.groupingBy(StockRequest::getVariantId, LinkedHashMap::new, Collectors.toList()));
        return grouped.entrySet().stream().filter(e -> byId.containsKey(e.getKey())).map(e -> {
            Variant v = byId.get(e.getKey());
            return new Waiting(v.getSku(), v.getProduct().getName(), v.getProduct().getSlug(), v.getColor(), v.getSize(),
                    Math.max(0, v.available()), v.getIncomingQty(), v.getRestockEta(),
                    e.getValue().stream().map(r -> new Waiter(r.getId(), emails.getOrDefault(r.getUserId(), "?"), r.getCreatedAt())).toList());
        }).sorted(Comparator.comparingInt((Waiting w) -> w.customers().size()).reversed().thenComparing(Waiting::sku)).toList();
    }

    /** The owners wrote to the customer: the request leaves the list. */
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional
    public void markNotified(String actorEmail, UUID requestId) {
        StockRequest r = requests.findById(requestId).orElseThrow(() -> new NotFoundException("No such request."));
        r.markNotified();
        audit.record(actorEmail, "STOCK_REQUEST_ANSWERED", "STOCK_REQUEST", requestId, null, Map.of("variantId", r.getVariantId().toString()));
    }

    private List<String> mine(User user) {
        List<StockRequest> open = requests.findByUserIdAndNotifiedAtIsNull(user.getId());
        if (open.isEmpty()) return List.of();
        return variants.findAllById(open.stream().map(StockRequest::getVariantId).toList()).stream().map(Variant::getSku).sorted().toList();
    }

    private User user(String email) {
        return users.findByEmail(email).orElseThrow(() -> new NotFoundException("Account not found."));
    }
}
