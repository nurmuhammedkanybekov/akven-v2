package com.akven.thesis.negotiation;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.catalog.VariantRepository;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.common.PageResponse;
import com.akven.thesis.negotiation.NegotiationDtos.NegotiateRequest;
import com.akven.thesis.negotiation.NegotiationDtos.NegotiateResponse;
import com.akven.thesis.negotiation.NegotiationDtos.SessionView;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * One chat message in, one validated offer out. The order of the steps is the thesis:
 * the assistant proposes, the PolicyValidator clamps, and only then is anything stored or said to the customer.
 * The assistant is never shown the cost price or the margin floor, and its own words are never sent as they are:
 * the reply is a template filled with the validated numbers.
 */
@Service
public class NegotiationService {

    static final String CAPPED_REPLY = "That is the best I can do on this one: {pct}% off, {price} a pair. It is already close to what the bazaar lets me give.";
    static final String NO_DISCOUNT_REPLY = "I cannot go below the list price on this one, {price} a pair. A bigger order or a bundle may open up a better price.";

    private final Negotiator negotiator;
    private final ProductKnowledge knowledge;
    private final PolicyValidator policy;
    private final VariantRepository variants;
    private final UserRepository users;
    private final NegotiationSessionRepository sessions;
    private final NegotiationRateLimiter limiter;
    private final AuditService audit;
    private final Duration offerTtl;
    private final boolean exposeProposal;

    public NegotiationService(Negotiator negotiator, ProductKnowledge knowledge, PolicyValidator policy, VariantRepository variants, UserRepository users,
                              NegotiationSessionRepository sessions, NegotiationRateLimiter limiter, AuditService audit,
                              @Value("${akven.negotiation.offer-ttl-hours:24}") long offerTtlHours,
                              @Value("${akven.demo.expose-proposal:false}") boolean exposeProposal) {
        this.negotiator = negotiator;
        this.knowledge = knowledge;
        this.policy = policy;
        this.variants = variants;
        this.users = users;
        this.sessions = sessions;
        this.limiter = limiter;
        this.audit = audit;
        this.offerTtl = Duration.ofHours(offerTtlHours);
        this.exposeProposal = exposeProposal;
    }

    @Transactional
    public NegotiateResponse negotiate(String customerEmail, NegotiateRequest request) {
        limiter.check(customerEmail);
        User customer = users.findByEmail(customerEmail).orElseThrow(() -> new NotFoundException("Account not found."));
        Variant variant = variants.findBySku(request.variantSku()).orElseThrow(() -> new NotFoundException("That item does not exist."));
        if (!variant.getProduct().isActive()) {
            throw new BusinessRuleException("That item is no longer sold.");
        }
        int quantity = request.quantity() == null ? 1 : request.quantity();
        BigDecimal list = variant.getPrice();

        Negotiator.Proposal proposal = negotiator.propose(new NegotiationContext(
                variant.getProduct().getName(), label(variant), list, quantity, request.message(),
                knowledge.retrieve(variant.getProduct(), variant, request.message(), 4)));
        BigDecimal proposed = proposal.discountPct() == null ? BigDecimal.ZERO : proposal.discountPct().max(BigDecimal.ZERO);
        BigDecimal validated = policy.clamp(proposed, variant);
        BigDecimal offer = list.multiply(BigDecimal.valueOf(100).subtract(validated)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        String template = validated.compareTo(proposed) < 0
                ? (validated.signum() == 0 ? NO_DISCOUNT_REPLY : CAPPED_REPLY)
                : proposal.replyTemplate();
        String reply = fill(template, validated, offer);

        NegotiationSession session = new NegotiationSession(customer, variant, quantity);
        session.recordOutcome("Customer: " + request.message().strip() + "\nAssistant [" + proposal.source() + "] (as proposed): " + proposal.replyTemplate()
                + "\nAssistant (as sent): " + reply, proposed, validated);
        sessions.saveAndFlush(session);
        audit.record(customerEmail, "NEGOTIATION", "NEGOTIATION_SESSION", session.getId(), null,
                Map.of("sku", variant.getSku(), "quantity", quantity, "assistant", proposal.source(), "proposedPct", proposed, "validatedPct", validated));

        return new NegotiateResponse(session.getId(), reply, validated, list, offer,
                session.getCreatedAt() == null ? null : session.getCreatedAt().plus(offerTtl), exposeProposal ? proposed : null);
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional(readOnly = true)
    public PageResponse<SessionView> list(int page, int pageSize) {
        return PageResponse.of(sessions.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(0, page), Math.min(Math.max(1, pageSize), 100))), NegotiationService::view);
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional(readOnly = true)
    public SessionView get(UUID id) {
        return sessions.findById(id).map(NegotiationService::view).orElseThrow(() -> new NotFoundException("Negotiation not found."));
    }

    static SessionView view(NegotiationSession s) {
        boolean clamped = s.getProposedDiscountPct() != null && s.getValidatedDiscountPct() != null
                && s.getValidatedDiscountPct().compareTo(s.getProposedDiscountPct()) < 0;
        return new SessionView(s.getId(), s.getCustomer().getEmail(), s.getVariant().getSku(), s.getVariant().getProduct().getName(), s.getQuantity(),
                s.getProposedDiscountPct(), s.getValidatedDiscountPct(), clamped, s.getTranscript(), s.getCreatedAt());
    }

    private static String fill(String template, BigDecimal pct, BigDecimal price) {
        return template.replace("{pct}", pct.stripTrailingZeros().toPlainString()).replace("{price}", "$" + price.toPlainString());
    }

    private static String label(Variant v) {
        StringBuilder sb = new StringBuilder();
        for (String part : new String[]{v.getColor(), v.getSize()}) {
            if (part != null && !part.isBlank()) sb.append(sb.length() > 0 ? ", " : "").append(part);
        }
        return sb.toString();
    }
}
