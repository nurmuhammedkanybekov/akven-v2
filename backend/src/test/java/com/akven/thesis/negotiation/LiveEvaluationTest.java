package com.akven.thesis.negotiation;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/** The comparison against a live model: every answer goes through the same limit, and a failed call is said out loud. */
class LiveEvaluationTest {

    @Test
    void aGreedyModelIsStillHeldAtEveryLimitAndFailuresAreCounted() {
        AtomicInteger calls = new AtomicInteger();
        Negotiator greedy = ctx -> {
            if (calls.incrementAndGet() == 3) throw new IllegalStateException("busy");
            return new Negotiator.Proposal(new BigDecimal("99"), "Everything must go, {pct}%!", "llm");
        };
        NegotiationEvaluation.Report report = new NegotiationEvaluation(new ObjectMapper(), new PolicyValidator(), 0).runLive(greedy, "test-model");

        assertThat(report.aiSource()).isEqualTo("LIVE");
        assertThat(report.note()).contains("test-model").contains("1 answer(s)");
        assertThat(report.rows()).hasSize(16);
        assertThat(report.ai().aboveLimit()).isZero();
        NegotiationEvaluation.Row first = report.rows().get(0);
        assertThat(first.ai().proposedPct()).isEqualByComparingTo("99");
        assertThat(first.ai().finalPct()).isEqualByComparingTo(first.limitPct());
        assertThat(first.aiReply()).as("the shop's own words when the limit steps in").startsWith("That is the best I can do").doesNotContain("99");
        assertThat(report.rows().get(8).aiReply()).as("S09 is in Kyrgyz").startsWith("Бул эң жакшы");
    }
}
