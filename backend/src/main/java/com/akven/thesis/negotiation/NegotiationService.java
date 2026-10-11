package com.akven.thesis.negotiation;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.catalog.StockStatus;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.catalog.VariantRepository;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.NotFoundException;
import com.akven.thesis.common.PageResponse;
import com.akven.thesis.negotiation.NegotiationDtos.NegotiateRequest;
import com.akven.thesis.negotiation.NegotiationDtos.NegotiateResponse;
import com.akven.thesis.negotiation.NegotiationDtos.PriceOutcome;
import com.akven.thesis.negotiation.NegotiationDtos.SessionView;
import com.akven.thesis.negotiation.NegotiationDtos.TurnView;
import com.akven.thesis.order.OrderItemRepository;
import com.akven.thesis.pricing.CollectionPricing;
import com.akven.thesis.pricing.PriceTier;
import com.akven.thesis.pricing.ShopPolicy;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * One chat message in, one validated offer out. The order of the steps is the thesis:
 * the assistant proposes, the PolicyValidator clamps, and only then is anything stored or said to the customer.
 * The assistant is never shown the cost price or the shop's limit, and its own words are never sent as they are:
 * the reply is a template filled with the validated numbers.
 *
 * A conversation continues while the customer talks about the same item: the assistant sees the earlier messages and
 * offers, every turn is stored, and the latest offer is the one that counts. A conversation that has ended (too long,
 * expired, already used in an order, or about another item) quietly starts again.
 */
@Service
public class NegotiationService {

    static final String CAPPED_REPLY = Replies.get(Replies.Key.CAPPED, Replies.EN);
    static final String NO_DISCOUNT_REPLY = Replies.get(Replies.Key.NO_DISCOUNT, Replies.EN);
    static final int MAX_TURNS = 12;
    private static final ZoneId BISHKEK = ZoneId.of("Asia/Bishkek");

    private final Negotiator negotiator;
    private final ProductKnowledge knowledge;
    private final PolicyValidator policy;
    private final VariantRepository variants;
    private final UserRepository users;
    private final NegotiationSessionRepository sessions;
    private final NegotiationTurnRepository turns;
    private final OrderItemRepository orderItems;
    private final CollectionPricing collections;
    private final NegotiationRateLimiter limiter;
    private final AuditService audit;
    private final Duration offerTtl;
    private final boolean exposeProposal;

    public NegotiationService(Negotiator negotiator, ProductKnowledge knowledge, PolicyValidator policy, VariantRepository variants, UserRepository users,
                              NegotiationSessionRepository sessions, NegotiationTurnRepository turns, OrderItemRepository orderItems,
                              CollectionPricing collections, NegotiationRateLimiter limiter, AuditService audit,
                              @Value("${akven.negotiation.offer-ttl-hours:24}") long offerTtlHours,
                              @Value("${akven.demo.expose-proposal:false}") boolean exposeProposal) {
        this.negotiator = negotiator;
        this.knowledge = knowledge;
        this.policy = policy;
        this.variants = variants;
        this.users = users;
        this.sessions = sessions;
        this.turns = turns;
        this.orderItems = orderItems;
        this.collections = collections;
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
        String language = Replies.language(request.language());
        String message = request.message().strip();
        BigDecimal list = variant.getPrice();

        NegotiationSession session = continuing(request.sessionId(), customer, variant);
        List<NegotiationTurn> earlier = session == null ? List.of() : turns.findBySessionIdOrderByPositionAsc(session.getId());
        List<NegotiationContext.Turn> history = earlier.stream()
                .map(t -> new NegotiationContext.Turn(t.getCustomerMessage(), t.getReply(), t.getValidatedDiscountPct())).toList();

        Negotiator.Proposal proposal = negotiator.propose(new NegotiationContext(
                variant.getProduct().getName(), label(variant), list, quantity, message,
                knowledge.retrieve(variant.getProduct(), variant, message, 4), language, history, shopTerms(variant)));
        BigDecimal proposed = proposal.discountPct() == null ? BigDecimal.ZERO : proposal.discountPct().max(BigDecimal.ZERO);
        BigDecimal validated = policy.clamp(proposed, variant);
        BigDecimal offer = list.multiply(BigDecimal.valueOf(100).subtract(validated)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        String reply = fill(template(proposal, proposed, validated, language), validated, money(offer, request.currency(), language));

        String lines = "Customer: " + message + "\nAssistant [" + proposal.source() + "] (as proposed): " + proposal.replyTemplate()
                + "\nAssistant (as sent): " + reply;
        if (session == null) {
            session = new NegotiationSession(customer, variant, quantity);
            session.recordOutcome(lines, proposed, validated);
        } else {
            session.recordNextTurn(lines, quantity, proposed, validated);
        }
        sessions.saveAndFlush(session);
        turns.save(new NegotiationTurn(session, earlier.size(), message, reply, language, proposal.source(), quantity, proposed, validated));
        audit.record(customerEmail, "NEGOTIATION", "NEGOTIATION_SESSION", session.getId(), null,
                Map.of("sku", variant.getSku(), "quantity", quantity, "turn", earlier.size() + 1, "assistant", proposal.source(),
                        "proposedPct", proposed, "validatedPct", validated));

        PriceOutcome outcome = validated.signum() == 0 ? PriceOutcome.LIST_PRICE
                : validated.compareTo(proposed) < 0 ? PriceOutcome.LIMITED_BY_SHOP : PriceOutcome.AS_OFFERED;
        Instant offeredAt = session.getOfferedAt();
        return new NegotiateResponse(session.getId(), reply, validated, list, offer,
                offeredAt == null ? null : offeredAt.plus(offerTtl), exposeProposal ? proposed : null, outcome);
    }

    /** The earlier conversation, if it may go on; null means start a new one. Someone else's conversation is not found. */
    private NegotiationSession continuing(UUID sessionId, User customer, Variant variant) {
        if (sessionId == null) return null;
        NegotiationSession s = sessions.findById(sessionId)
                .filter(x -> x.getCustomer().getId().equals(customer.getId()))
                .orElseThrow(() -> new NotFoundException("Negotiation not found."));
        boolean sameItem = s.getVariant().getId().equals(variant.getId());
        boolean fresh = s.getOfferedAt() == null || s.getOfferedAt().isAfter(Instant.now().minus(offerTtl));
        boolean open = sameItem && fresh && !orderItems.existsByNegotiationSessionId(s.getId())
                && turns.findBySessionIdOrderByPositionAsc(s.getId()).size() < MAX_TURNS;
        return open ? s : null;
    }

    /** Public rules worth knowing in a bargain. Nothing here is secret: customers see all of it on the site. */
    private List<String> shopTerms(Variant variant) {
        List<String> terms = new ArrayList<>();
        ShopPolicy shop = collections.policy();
        terms.add("Smallest order: " + shop.getMinOrderPairs() + " pairs in total, any socks mixed.");
        for (PriceTier tier : collections.ladder()) {
            terms.add("Collection step: from " + tier.getMinPairs() + " pairs in one order, every pair is "
                    + tier.getDiscountPct().stripTrailingZeros().toPlainString() + "% cheaper, applied at checkout.");
        }
        terms.add("A customer gets the bigger of your offer and their collection step, never both added together.");
        StockStatus stock = variant.stockStatus(shop.getFewLeftThreshold(), LocalDate.now(BISHKEK));
        terms.add("Stock of this sock: " + switch (stock) {
            case IN_STOCK -> "in stock";
            case FEW_LEFT -> "only a few left";
            case COMING_SOON -> "sold out, more arriving soon";
            case SOLD_OUT -> "sold out";
        } + ".");
        terms.add("Pickup at the container at Dordoi, or delivery to Kyrgyzstan, Kazakhstan, Uzbekistan and Russia.");
        return terms;
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional(readOnly = true)
    public PageResponse<SessionView> list(int page, int pageSize) {
        return PageResponse.of(sessions.findAllByOrderByCreatedAtDesc(PageRequest.of(Math.max(0, page), Math.min(Math.max(1, pageSize), 100))),
                s -> view(s, List.of()));
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    @Transactional(readOnly = true)
    public SessionView get(UUID id) {
        return sessions.findById(id).map(s -> view(s, turns.findBySessionIdOrderByPositionAsc(id).stream().map(TurnView::of).toList()))
                .orElseThrow(() -> new NotFoundException("Negotiation not found."));
    }

    static SessionView view(NegotiationSession s, List<TurnView> turns) {
        boolean clamped = s.getProposedDiscountPct() != null && s.getValidatedDiscountPct() != null
                && s.getValidatedDiscountPct().compareTo(s.getProposedDiscountPct()) < 0;
        return new SessionView(s.getId(), s.getCustomer().getEmail(), s.getVariant().getSku(), s.getVariant().getProduct().getName(), s.getQuantity(),
                s.getProposedDiscountPct(), s.getValidatedDiscountPct(), clamped, s.getTranscript(), s.getCreatedAt(), turns);
    }

    /**
     * What is said: the assistant's own words only when the shop allowed its full proposal. When the limit stepped in,
     * the shop's own sentence in the customer's language, so the customer never reads a promise that was not kept.
     */
    static String template(Negotiator.Proposal proposal, BigDecimal proposed, BigDecimal validated, String language) {
        if (validated.compareTo(proposed) < 0) {
            return Replies.get(validated.signum() == 0 ? Replies.Key.NO_DISCOUNT : Replies.Key.CAPPED, language);
        }
        if (validated.signum() == 0 && proposal.replyTemplate().contains("{pct}")) return Replies.get(Replies.Key.NO_DISCOUNT, language);
        return proposal.replyTemplate();
    }

    static String fill(String template, BigDecimal pct, BigDecimal price) {
        return fill(template, pct, "$" + price.toPlainString());
    }

    static String fill(String template, BigDecimal pct, String price) {
        return template.replace("{pct}", pct.stripTrailingZeros().toPlainString()).replace("{price}", price);
    }

    /** "$7.13", or in som at the owners' rate: "620 som" / "620 сом", with a space between thousands. */
    private String money(BigDecimal usd, String currency, String language) {
        if (!"KGS".equals(currency)) return "$" + usd.toPlainString();
        String som = String.format(java.util.Locale.ROOT, "%,d", collections.policy().toSom(usd)).replace(',', '\u00a0');
        return som + (Replies.EN.equals(language) ? " som" : " сом");
    }

    static String label(Variant v) {
        StringBuilder sb = new StringBuilder();
        for (String part : new String[]{v.getColor(), v.getSize()}) {
            if (part != null && !part.isBlank()) sb.append(sb.length() > 0 ? ", " : "").append(part);
        }
        return sb.toString();
    }
}
