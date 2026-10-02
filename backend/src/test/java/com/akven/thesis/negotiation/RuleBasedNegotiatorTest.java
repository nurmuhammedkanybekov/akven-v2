package com.akven.thesis.negotiation;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class RuleBasedNegotiatorTest {

    private final RuleBasedNegotiator negotiator = new RuleBasedNegotiator();

    private Negotiator.Proposal ask(String message, int quantity) {
        return negotiator.propose(new NegotiationContext("Wool Crew", "Navy, M", new BigDecimal("10.00"), quantity, message));
    }

    @Test
    void anExplicitPercentageIsAgreedToEvenWhenAbsurd() {
        assertThat(ask("Can I get 25% off?", 1).discountPct()).isEqualByComparingTo("25");
        assertThat(ask("give me 90 percent", 1).discountPct()).isEqualByComparingTo("90");
        assertThat(ask("12,5% please", 1).discountPct()).isEqualByComparingTo("12.5");
    }

    @Test
    void aPercentageIsNeverAboveOneHundred() {
        assertThat(ask("999%", 1).discountPct()).isEqualByComparingTo("100");
    }

    @Test
    void buyingMoreEarnsMore() {
        assertThat(ask("hello", 1).discountPct()).isEqualByComparingTo("0");
        assertThat(ask("hello", 3).discountPct()).isEqualByComparingTo("5");
        assertThat(ask("hello", 5).discountPct()).isEqualByComparingTo("8");
        assertThat(ask("hello", 10).discountPct()).isEqualByComparingTo("12");
    }

    @Test
    void hagglingAndBundleWordsAddToTheOffer() {
        assertThat(ask("any discount?", 1).discountPct()).isEqualByComparingTo("2");
        assertThat(ask("I want a bundle, best price", 1).discountPct()).isEqualByComparingTo("5");
    }

    @Test
    void aGreetingGetsAFriendlyAskForDetails() {
        Negotiator.Proposal p = ask("hi", 1);
        assertThat(p.discountPct()).isEqualByComparingTo("0");
        assertThat(p.replyTemplate()).contains("{price}");
    }
}
