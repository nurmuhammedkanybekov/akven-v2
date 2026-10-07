package com.akven.thesis.pricing;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.ConflictException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.pricing.PricingDtos.PolicyRequest;
import com.akven.thesis.pricing.PricingDtos.PolicyView;
import com.akven.thesis.pricing.PricingDtos.PublicPricing;
import com.akven.thesis.pricing.PricingDtos.PublicTier;
import com.akven.thesis.pricing.PricingDtos.TierRequest;
import com.akven.thesis.pricing.PricingDtos.TierView;
import com.akven.thesis.pricing.PricingDtos.TrustView;
import com.akven.thesis.user.Role;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The owners' pricing controls: the minimum order, the price ladder and trusted customers. Only ADMIN (an owner) may
 * read or change them; staff run the stall but do not set prices. Every change goes to the audit log with the value
 * before and after, in the same transaction.
 */
@Service
public class PricingAdminService {

    /** The policy is a single row without a UUID of its own; the audit log files its changes under this id. */
    static final UUID POLICY_AUDIT_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final ShopPolicyRepository policies;
    private final PriceTierRepository tiers;
    private final UserRepository users;
    private final CollectionPricing collections;
    private final AuditService audit;

    public PricingAdminService(ShopPolicyRepository policies, PriceTierRepository tiers, UserRepository users,
                               CollectionPricing collections, AuditService audit) {
        this.policies = policies;
        this.tiers = tiers;
        this.users = users;
        this.collections = collections;
        this.audit = audit;
    }

    /** What every visitor may see. */
    @Transactional(readOnly = true)
    public PublicPricing publicPricing() {
        return new PublicPricing(collections.policy().getMinOrderPairs(),
                collections.ladder().stream().map(t -> new PublicTier(t.getMinPairs(), t.getDiscountPct())).toList());
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public PolicyView policy() {
        return PolicyView.of(collections.policy());
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public PolicyView updatePolicy(String actorEmail, PolicyRequest r) {
        if (r.trustedMinOrderPairs() > r.minOrderPairs()) {
            throw new BusinessRuleException("The minimum for trusted customers cannot be higher than the normal minimum.");
        }
        ShopPolicy policy = policies.findById(ShopPolicy.ID).orElseGet(ShopPolicy::defaults);
        PolicyView before = PolicyView.of(policy);
        int fewLeft = r.fewLeftThreshold() == null ? policy.getFewLeftThreshold() : r.fewLeftThreshold();
        policy.update(r.minOrderPairs(), r.trustedMinOrderPairs(), r.trustedAfterOrders(), fewLeft);
        PolicyView after = PolicyView.of(policies.saveAndFlush(policy));
        audit.record(actorEmail, "PRICING_POLICY_UPDATED", "SHOP_POLICY", POLICY_AUDIT_ID, before, after);
        return after;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('ADMIN')")
    public List<TierView> tiers() {
        return collections.ladder().stream().map(TierView::of).toList();
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public TierView createTier(String actorEmail, TierRequest r) {
        requireFreeStep(r.minPairs(), null);
        PriceTier tier = tiers.saveAndFlush(new PriceTier(r.minPairs(), r.discountPct()));
        TierView view = TierView.of(tier);
        audit.record(actorEmail, "PRICE_TIER_CREATED", "PRICE_TIER", tier.getId(), null, view);
        return view;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public TierView updateTier(String actorEmail, UUID id, TierRequest r) {
        PriceTier tier = tiers.findById(id).orElseThrow(() -> new NotFoundException("Price step not found."));
        requireFreeStep(r.minPairs(), id);
        TierView before = TierView.of(tier);
        tier.update(r.minPairs(), r.discountPct());
        TierView after = TierView.of(tiers.saveAndFlush(tier));
        audit.record(actorEmail, "PRICE_TIER_UPDATED", "PRICE_TIER", id, before, after);
        return after;
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteTier(String actorEmail, UUID id) {
        PriceTier tier = tiers.findById(id).orElseThrow(() -> new NotFoundException("Price step not found."));
        TierView before = TierView.of(tier);
        tiers.delete(tier);
        audit.record(actorEmail, "PRICE_TIER_DELETED", "PRICE_TIER", id, before, null);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public TrustView setTrusted(String actorEmail, UUID customerId, boolean trusted) {
        User customer = users.findById(customerId).filter(u -> u.getRole() == Role.CUSTOMER)
                .orElseThrow(() -> new NotFoundException("Customer not found."));
        boolean before = customer.isTrusted();
        customer.setTrusted(trusted);
        users.saveAndFlush(customer);
        audit.record(actorEmail, "CUSTOMER_TRUST_CHANGED", "USER", customerId, Map.of("trusted", before), Map.of("trusted", trusted));
        return new TrustView(customerId, trusted);
    }

    private void requireFreeStep(int minPairs, UUID except) {
        tiers.findByMinPairs(minPairs).filter(t -> !t.getId().equals(except)).ifPresent(t -> {
            throw new ConflictException("There is already a price step for " + minPairs + " pairs.");
        });
    }
}
