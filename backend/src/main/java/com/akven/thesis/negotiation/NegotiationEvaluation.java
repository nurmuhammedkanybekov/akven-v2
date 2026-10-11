package com.akven.thesis.negotiation;

import com.akven.thesis.catalog.Variant;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.function.Function;

/**
 * The comparison for the evaluation chapter: the same simulated customers meet the rule-based assistant and the AI
 * assistant, and both proposals pass the same PolicyValidator. For each side it reports the discount given, how often
 * the customer would buy (the final discount reaches their walk-away point), how often the shop's limit had to step in,
 * and, as the safety check, how many final prices are still above the limit (must be zero).
 *
 * The AI side normally reads answers from a file instead of calling a model, so the report needs no key and costs
 * nothing, and the thesis numbers can be reproduced. The file says where its answers come from (SCRIPTED by hand, or
 * RECORDED from a live run), and every report carries that label. The super admin can also run the same customers
 * against the live model (LIVE); a live answer the model cannot give falls back to the rules, as in the shop.
 */
@Component
public class NegotiationEvaluation {

    static final String SCENARIOS = "negotiation/evaluation-scenarios.json";

    /** aiPct and aiReply are the AI's recorded answer; language is the customer's (en when absent). */
    public record Scenario(String id, String customer, String message, int quantity, BigDecimal listPrice,
                           BigDecimal marginFloorPct, BigDecimal walkAwayPct, BigDecimal aiPct, String aiReply, String language) {}

    record ScenarioFile(String aiSource, String note, List<Scenario> scenarios) {}

    /** finalPct is what the customer is offered after the PolicyValidator; limited when the validator cut it. */
    public record Result(BigDecimal proposedPct, BigDecimal finalPct, boolean limited, boolean accepted, BigDecimal pricePerPair) {}

    /** limitPct is the scenario's own invented limit; the scenarios are examples, not the shop's real numbers. */
    public record Row(String id, String customer, String message, int quantity, BigDecimal listPrice, BigDecimal limitPct,
                      BigDecimal walkAwayPct, Result rule, Result ai, String aiReply) {}

    /** aboveLimit counts final prices above the shop's limit: the safety property, which must stay at zero. */
    public record Summary(BigDecimal averageFinalPct, BigDecimal acceptedPct, int limited, int aboveLimit, BigDecimal revenue) {}

    public record Report(String aiSource, String note, List<Row> rows, Summary rule, Summary ai) {}

    private final ObjectMapper json;
    private final PolicyValidator validator;
    private final Negotiator ruleBased = new RuleBasedNegotiator();

    private final long livePauseMillis;

    public NegotiationEvaluation(ObjectMapper json, PolicyValidator validator,
                                 @org.springframework.beans.factory.annotation.Value("${akven.llm.evaluation-pause-ms:4500}") long livePauseMillis) {
        this.json = json;
        this.validator = validator;
        this.livePauseMillis = livePauseMillis;
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public Report run() {
        ScenarioFile file = load();
        List<Row> rows = file.scenarios().stream().map(s -> play(s, s.aiPct(), s.aiReply())).toList();
        return new Report(file.aiSource(), file.note(), rows, summarise(rows, Row::rule), summarise(rows, Row::ai));
    }

    /** The same customers against the live model, one question each. Costs one model call per customer. */
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public Report runLive(Negotiator ai, String model) {
        List<Row> rows = new java.util.ArrayList<>();
        int fallbacks = 0;
        for (Scenario s : load().scenarios()) {
            if (!rows.isEmpty()) pause();   // a free plan allows about fifteen requests a minute
            Negotiator.Proposal p;
            try {
                p = ai.propose(context(s));
            } catch (RuntimeException e) {
                p = ruleBased.propose(context(s));
                fallbacks++;
            }
            rows.add(play(s, p.discountPct(), shown(s, p)));
        }
        String note = "Live run of " + model + " on " + java.time.LocalDate.now(java.time.ZoneId.of("Asia/Bishkek")) + ", each customer asked once."
                + (fallbacks == 0 ? "" : " " + fallbacks + " answer(s) could not be had from the model and came from the rules.");
        return new Report("LIVE", note, rows, summarise(rows, Row::rule), summarise(rows, Row::ai));
    }

    /** The reply as the customer would read it: through the same choice of words and the same numbers as the chat. */
    private String shown(Scenario s, Negotiator.Proposal p) {
        Variant sock = new Variant(null, s.id(), null, null, 1, s.listPrice(), BigDecimal.ZERO, s.marginFloorPct());
        BigDecimal proposed = p.discountPct() == null ? BigDecimal.ZERO : p.discountPct().max(BigDecimal.ZERO);
        BigDecimal pct = validator.clamp(proposed, sock);
        BigDecimal price = s.listPrice().multiply(BigDecimal.valueOf(100).subtract(pct)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return NegotiationService.fill(NegotiationService.template(p, proposed, pct, s.language()), pct, price);
    }

    private void pause() {
        try {
            Thread.sleep(livePauseMillis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static NegotiationContext context(Scenario s) {
        return new NegotiationContext("Socks", "", s.listPrice(), s.quantity(), s.message(), List.of(), s.language(), List.of(), List.of());
    }

    private Row play(Scenario s, BigDecimal aiProposal, String aiReply) {
        Variant sock = new Variant(null, s.id(), null, null, 1, s.listPrice(), BigDecimal.ZERO, s.marginFloorPct());
        BigDecimal ruleProposal = ruleBased.propose(context(s)).discountPct();
        return new Row(s.id(), s.customer(), s.message(), s.quantity(), s.listPrice(), s.marginFloorPct(), s.walkAwayPct(),
                judge(s, sock, ruleProposal), judge(s, sock, aiProposal), aiReply);
    }

    private Result judge(Scenario s, Variant sock, BigDecimal proposed) {
        BigDecimal p = proposed == null ? BigDecimal.ZERO : proposed.max(BigDecimal.ZERO);
        BigDecimal finalPct = validator.clamp(p, sock);
        BigDecimal price = s.listPrice().multiply(BigDecimal.valueOf(100).subtract(finalPct)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return new Result(p, finalPct, finalPct.compareTo(p) < 0, finalPct.compareTo(s.walkAwayPct()) >= 0, price);
    }

    private static Summary summarise(List<Row> rows, Function<Row, Result> side) {
        int n = rows.size();
        BigDecimal sumPct = BigDecimal.ZERO, revenue = BigDecimal.ZERO;
        int accepted = 0, limited = 0, above = 0;
        for (Row r : rows) {
            Result x = side.apply(r);
            sumPct = sumPct.add(x.finalPct());
            if (x.accepted()) {
                accepted++;
                revenue = revenue.add(x.pricePerPair().multiply(BigDecimal.valueOf(r.quantity())));
            }
            if (x.limited()) limited++;
            // The safety property, checked on the final price itself rather than through the validator's own code.
            BigDecimal lowestAllowed = r.listPrice().multiply(BigDecimal.valueOf(100).subtract(r.limitPct()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (x.pricePerPair().compareTo(lowestAllowed) < 0) above++;
        }
        return new Summary(n == 0 ? null : sumPct.divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_UP),
                n == 0 ? null : BigDecimal.valueOf(accepted * 100L).divide(BigDecimal.valueOf(n), 1, RoundingMode.HALF_UP),
                limited, above, revenue);
    }

    private ScenarioFile load() {
        try (InputStream in = new ClassPathResource(SCENARIOS).getInputStream()) {
            return json.readValue(in, ScenarioFile.class);
        } catch (IOException e) {
            throw new IllegalStateException("Could not read " + SCENARIOS, e);
        }
    }
}
