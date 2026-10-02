package com.akven.thesis.order;

import com.akven.thesis.catalog.Variant;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.negotiation.NegotiationSession;
import com.akven.thesis.negotiation.NegotiationSessionRepository;
import com.akven.thesis.negotiation.PolicyValidator;
import com.akven.thesis.user.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * The only place a price is decided. The client sends which item and how many, never a price. A negotiated discount
 * applies only if the offer is really the customer's, for this very item, fresh, and unused, and even then it passes
 * through the PolicyValidator once more here. So a tampered database row, a replayed offer or a forged request cannot
 * produce a price below the margin floor.
 */
@Service
public class PricingService {

    public record PricedLine(BigDecimal listPrice, BigDecimal discountPct, BigDecimal unitPrice, UUID sessionId) {}

    private final NegotiationSessionRepository sessions;
    private final OrderItemRepository orderItems;
    private final PolicyValidator policyValidator;
    private final Duration offerTtl;

    public PricingService(NegotiationSessionRepository sessions, OrderItemRepository orderItems, PolicyValidator policyValidator,
                          @Value("${akven.negotiation.offer-ttl-hours:24}") long offerTtlHours) {
        this.sessions = sessions;
        this.orderItems = orderItems;
        this.policyValidator = policyValidator;
        this.offerTtl = Duration.ofHours(offerTtlHours);
    }

    /** @throws BusinessRuleException when an offer was given but cannot be honoured (the message is customer-readable). */
    public PricedLine price(Variant variant, UUID negotiationSessionId, User customer) {
        BigDecimal list = variant.getPrice();
        if (negotiationSessionId == null) {
            return new PricedLine(list, BigDecimal.ZERO, list, null);
        }
        if (customer == null) {
            throw new BusinessRuleException("Sign in to use your negotiated price.");
        }
        NegotiationSession session = sessions.findById(negotiationSessionId)
                .orElseThrow(() -> new BusinessRuleException("That offer no longer exists."));
        if (!session.getCustomer().getId().equals(customer.getId()) || !session.getVariant().getId().equals(variant.getId())) {
            throw new BusinessRuleException("That offer is not for this item.");
        }
        if (session.getCreatedAt() != null && session.getCreatedAt().isBefore(Instant.now().minus(offerTtl))) {
            throw new BusinessRuleException("That offer has expired. Ask for a new price.");
        }
        if (orderItems.existsByNegotiationSessionId(session.getId())) {
            throw new BusinessRuleException("That offer has already been used.");
        }
        BigDecimal pct = policyValidator.clamp(session.getValidatedDiscountPct(), variant);
        BigDecimal unit = list.multiply(BigDecimal.valueOf(100).subtract(pct)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return new PricedLine(list, pct, unit, session.getId());
    }
}
