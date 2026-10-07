package com.akven.thesis.pricing;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.order.OrderRepository;
import com.akven.thesis.order.OrderStatus;
import com.akven.thesis.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Looks at a whole cart as one collection: how many pairs it holds (a pack of 10 counts as 10), whether that meets the
 * owners' minimum, and which step of the price ladder it reaches. Customers may mix any socks to get there.
 */
@Service
@Transactional(readOnly = true)
public class CollectionPricing {

    /** The next step up the ladder, so the shop can say "add 4 more pairs to save 5%". */
    public record NextTier(int minPairs, BigDecimal discountPct, int pairsToGo) {}

    public record Collection(int totalPairs, int minimumPairs, boolean trusted, BigDecimal tierDiscountPct, NextTier next) {

        public boolean belowMinimum() {
            return totalPairs < minimumPairs;
        }

        public String minimumMessage() {
            return "The minimum order is " + minimumPairs + " pairs. You can mix different socks to reach it.";
        }
    }

    private final ShopPolicyRepository policies;
    private final PriceTierRepository tiers;
    private final OrderRepository orders;

    public CollectionPricing(ShopPolicyRepository policies, PriceTierRepository tiers, OrderRepository orders) {
        this.policies = policies;
        this.tiers = tiers;
        this.orders = orders;
    }

    public ShopPolicy policy() {
        return policies.findById(ShopPolicy.ID).orElseGet(ShopPolicy::defaults);
    }

    public List<PriceTier> ladder() {
        return tiers.findAllByOrderByMinPairsAsc();
    }

    /** Pairs in one cart line: a variant sold as a pack of 10 counts ten pairs per unit. */
    public static int pairs(Variant variant, int quantity) {
        Integer pack = variant.getPackSize();
        return quantity * (pack == null || pack < 1 ? 1 : pack);
    }

    /** @param quantities the lines that can actually be bought; customer is null for a visitor. */
    public Collection evaluate(Map<Variant, Integer> quantities, User customer) {
        int total = quantities.entrySet().stream().mapToInt(e -> pairs(e.getKey(), e.getValue())).sum();
        ShopPolicy policy = policy();
        boolean trusted = isTrusted(customer, policy);
        int minimum = trusted ? policy.getTrustedMinOrderPairs() : policy.getMinOrderPairs();

        BigDecimal pct = BigDecimal.ZERO;
        NextTier next = null;
        for (PriceTier tier : ladder()) {
            if (tier.getMinPairs() <= total) {
                pct = tier.getDiscountPct();
            } else if (next == null && tier.getDiscountPct().compareTo(pct) > 0) {
                next = new NextTier(tier.getMinPairs(), tier.getDiscountPct(), tier.getMinPairs() - total);
            }
        }
        return new Collection(total, minimum, trusted, pct, next);
    }

    private boolean isTrusted(User customer, ShopPolicy policy) {
        if (customer == null) return false;
        if (customer.isTrusted()) return true;
        long paid = orders.countByCustomerIdAndStatusIn(customer.getId(), List.of(OrderStatus.PAID, OrderStatus.FULFILLED));
        return paid >= policy.getTrustedAfterOrders();
    }
}
