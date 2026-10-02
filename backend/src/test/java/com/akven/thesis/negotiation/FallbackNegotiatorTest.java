package com.akven.thesis.negotiation;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class FallbackNegotiatorTest {

    private static final NegotiationContext CTX = new NegotiationContext("Wool Crew", null, new BigDecimal("10.00"), 1, "could you do 10%?");

    @Test
    void usesThePrimaryWhenItWorks() {
        Negotiator n = new FallbackNegotiator(c -> new Negotiator.Proposal(BigDecimal.ONE, "x", "llm"), new RuleBasedNegotiator());
        assertThat(n.propose(CTX).source()).isEqualTo("llm");
    }

    @Test
    void fallsBackToTheRulesWhenThePrimaryFails() {
        Negotiator n = new FallbackNegotiator(c -> { throw new IllegalStateException("down"); }, new RuleBasedNegotiator());
        Negotiator.Proposal p = n.propose(CTX);
        assertThat(p.source()).isEqualTo("rules-fallback");
        assertThat(p.discountPct()).isEqualByComparingTo("10");
    }
}
