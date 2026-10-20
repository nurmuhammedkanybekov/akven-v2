package com.akven.thesis.saved;

import com.akven.thesis.catalog.CatalogService;
import com.akven.thesis.catalog.CatalogViews.ProductSummary;
import com.akven.thesis.catalog.Product;
import com.akven.thesis.catalog.ProductRepository;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Saved socks in the account, so the heart follows a customer between devices. On sign-in the browser's own list is
 * merged in once. Only active products are listed; a sock taken off the shelf quietly drops out of the list.
 */
@Service
public class SavedService {

    /** The same limit the browser keeps. */
    public static final int MAX = 200;

    private final SavedItemRepository saved;
    private final ProductRepository products;
    private final UserRepository users;
    private final CatalogService catalog;

    public SavedService(SavedItemRepository saved, ProductRepository products, UserRepository users, CatalogService catalog) {
        this.saved = saved;
        this.products = products;
        this.users = users;
        this.catalog = catalog;
    }

    @Transactional(readOnly = true)
    public List<ProductSummary> mine(String email) {
        return catalog.summariesOf(saved.findByUserIdOrderByCreatedAtDesc(user(email)).stream().map(SavedItem::getProductId).toList());
    }

    @Transactional
    public List<ProductSummary> save(String email, String slug) {
        UUID userId = user(email);
        Product p = products.findBySlugAndActiveTrue(slug).orElseThrow(() -> new NotFoundException("Product not found."));
        if (saved.findByUserIdAndProductId(userId, p.getId()).isEmpty()) {
            if (saved.countByUserId(userId) >= MAX) throw new BusinessRuleException("You have saved " + MAX + " socks. Remove some first.");
            saved.save(new SavedItem(userId, p.getId()));
        }
        return mine(email);
    }

    @Transactional
    public List<ProductSummary> remove(String email, String slug) {
        UUID userId = user(email);
        products.findBySlug(slug).flatMap(p -> saved.findByUserIdAndProductId(userId, p.getId())).ifPresent(saved::delete);
        return mine(email);
    }

    /** Adds the browser's saved socks to the account's (unknown slugs are skipped), oldest first so order is kept. */
    @Transactional
    public List<ProductSummary> merge(String email, List<String> slugs) {
        UUID userId = user(email);
        long count = saved.countByUserId(userId);
        for (int i = slugs.size() - 1; i >= 0; i--) {
            String slug = slugs.get(i);
            if (count >= MAX) break;
            var product = products.findBySlugAndActiveTrue(slug);
            if (product.isPresent() && saved.findByUserIdAndProductId(userId, product.get().getId()).isEmpty()) {
                saved.save(new SavedItem(userId, product.get().getId()));
                count++;
            }
        }
        return mine(email);
    }

    private UUID user(String email) {
        return users.findByEmail(email).map(User::getId).orElseThrow(() -> new NotFoundException("Account not found."));
    }
}
