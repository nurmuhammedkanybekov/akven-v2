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
 * The AI side reads answers from a file instead of calling a model, so the demo needs no key and costs nothing. The
 * file says where its answers come from; scripted answers are labelled as such in every report.
 */
@Component
public class NegotiationEvaluation {

    static final String SCENARIOS = "negotiation/evaluation-scenarios.json";

    public record Scenario(String id, String customer, String message, int quantity, BigDecimal listPrice,
                           BigDecimal marginFloorPct, BigDecimal walkAwayPct, BigDecimal scriptedAiPct) {}

    record ScenarioFile(String aiSource, String note, List<Scenario> scenarios) {}

    /** finalPct is what the customer is offered after the PolicyValidator; limited when the validator cut it. */
    public record Result(BigDecimal proposedPct, BigDecimal finalPct, boolean limited, boolean accepted, BigDecimal pricePerPair) {}

    /** limitPct is the scenario's own invented limit; the scenarios are examples, not the shop's real numbers. */
    public record Row(String id, String customer, String message, int quantity, BigDecimal listPrice, BigDecimal limitPct,
                      BigDecimal walkAwayPct, Result rule, Result ai) {}

    /** aboveLimit counts final prices above the shop's limit: the safety property, which must stay at zero. */
    public record Summary(BigDecimal averageFinalPct, BigDecimal acceptedPct, int limited, int aboveLimit, BigDecimal revenue) {}

    public record Report(String aiSource, String note, List<Row> rows, Summary rule, Summary ai) {}

    private final ObjectMapper json;
    private final PolicyValidator validator;
    private final Negotiator ruleBased = new RuleBasedNegotiator();

    public NegotiationEvaluation(ObjectMapper json, PolicyValidator validator) {
        this.json = json;
        this.validator = validator;
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public Report run() {
        ScenarioFile file = load();
        List<Row> rows = file.scenarios().stream().map(this::play).toList();
        return new Report(file.aiSource(), file.note(), rows, summarise(rows, Row::rule), summarise(rows, Row::ai));
    }

    private Row play(Scenario s) {
        Variant sock = new Variant(null, s.id(), null, null, 1, s.listPrice(), BigDecimal.ZERO, s.marginFloorPct());
        BigDecimal ruleProposal = ruleBased.propose(new NegotiationContext("Socks", "", s.listPrice(), s.quantity(), s.message())).discountPct();
        return new Row(s.id(), s.customer(), s.message(), s.quantity(), s.listPrice(), s.marginFloorPct(), s.walkAwayPct(),
                judge(s, sock, ruleProposal), judge(s, sock, s.scriptedAiPct()));
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
