package com.akven.thesis.negotiation;

import com.akven.thesis.audit.AuditService;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.catalog.VariantRepository;
import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.common.NotFoundException;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * The super admin's controls for the assistant: which one answers the chat, whether the model is configured, how often
 * each assistant answered lately, a test message that is not stored, and the comparison against the live model. The
 * key itself is never shown, stored or sent anywhere but to the model.
 */
@Service
public class AssistantAdmin {

    /** The audit log needs an entity id; settings have none, so this one stands for "the assistant setting". */
    static final UUID SETTING_ID = UUID.nameUUIDFromBytes("assistant.mode".getBytes(java.nio.charset.StandardCharsets.UTF_8));

    public record Status(String mode, boolean aiConfigured, String model, String endpointHost, Map<String, Long> answersLast7Days) {}

    public record ModeRequest(@NotNull @Pattern(regexp = "ai|rules") String mode) {}

    public record TryRequest(@NotBlank @Size(max = 64) String sku, @NotBlank @Size(max = 500) String message,
                             @Min(1) @Max(999) Integer quantity, @Pattern(regexp = "en|ru|ky") String language) {}

    public record TryResult(String assistant, BigDecimal proposedPct, BigDecimal validatedPct, BigDecimal offerPrice, String reply, long millis) {}

    private final AssistantSwitch assistantSwitch;
    private final AiAssistant ai;
    private final Negotiator negotiator;
    private final PolicyValidator policy;
    private final ProductKnowledge knowledge;
    private final VariantRepository variants;
    private final NegotiationTurnRepository turns;
    private final NegotiationEvaluation evaluation;
    private final AuditService audit;

    public AssistantAdmin(AssistantSwitch assistantSwitch, AiAssistant ai, Negotiator negotiator, PolicyValidator policy, ProductKnowledge knowledge,
                          VariantRepository variants, NegotiationTurnRepository turns, NegotiationEvaluation evaluation, AuditService audit) {
        this.assistantSwitch = assistantSwitch;
        this.ai = ai;
        this.negotiator = negotiator;
        this.policy = policy;
        this.knowledge = knowledge;
        this.variants = variants;
        this.turns = turns;
        this.evaluation = evaluation;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public Status status() {
        Map<String, Long> counts = new TreeMap<>();
        for (Object[] row : turns.countByAssistantSince(Instant.now().minus(Duration.ofDays(7)))) {
            counts.put((String) row[0], ((Number) row[1]).longValue());
        }
        return new Status(assistantSwitch.mode(), ai.configured(), ai.model(), ai.endpointHost(), counts);
    }

    @Transactional
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public Status setMode(String actorEmail, String mode) {
        String before = assistantSwitch.mode();
        if (AssistantSwitch.AI.equals(mode) && !ai.configured()) {
            throw new BusinessRuleException("The AI assistant has no key yet. Put LLM_API_KEY in the .env file and restart.");
        }
        assistantSwitch.set(mode);
        audit.record(actorEmail, "ASSISTANT_MODE_CHANGED", "APP_SETTING", SETTING_ID, Map.of("mode", before), Map.of("mode", mode));
        return status();
    }

    /** One message through the assistant that answers the chat now, and the PolicyValidator. Nothing is stored. */
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public TryResult tryMessage(TryRequest r) {
        Variant v = variants.findBySku(r.sku()).orElseThrow(() -> new NotFoundException("That item does not exist."));
        int quantity = r.quantity() == null ? 1 : r.quantity();
        long start = System.nanoTime();
        Negotiator.Proposal p = negotiator.propose(new NegotiationContext(v.getProduct().getName(), NegotiationService.label(v), v.getPrice(), quantity,
                r.message().strip(), knowledge.retrieve(v.getProduct(), v, r.message(), 4), r.language(), List.of(), List.of()));
        long millis = Duration.ofNanos(System.nanoTime() - start).toMillis();
        BigDecimal proposed = p.discountPct() == null ? BigDecimal.ZERO : p.discountPct().max(BigDecimal.ZERO);
        BigDecimal validated = policy.clamp(proposed, v);
        BigDecimal price = v.getPrice().multiply(BigDecimal.valueOf(100).subtract(validated)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        String reply = NegotiationService.fill(NegotiationService.template(p, proposed, validated, r.language()), validated, price);
        return new TryResult(p.source(), proposed, validated, price, reply, millis);
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public NegotiationEvaluation.Report liveEvaluation() {
        if (!ai.configured()) throw new BusinessRuleException("The AI assistant has no key yet. Put LLM_API_KEY in the .env file and restart.");
        return evaluation.runLive(ai.negotiator(), ai.model());
    }
}
