package com.akven.thesis.negotiation;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

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

    @Test
    void russianAndKyrgyzAreUnderstoodAndAnsweredInKind() {
        NegotiationContext ru = new NegotiationContext("Wool Crew", "", new BigDecimal("10.00"), 1, "Скидка 20 процентов?", List.of(), "ru", List.of(), List.of());
        Negotiator.Proposal p = negotiator.propose(ru);
        assertThat(p.discountPct()).isEqualByComparingTo("20");
        assertThat(p.replyTemplate()).startsWith("Договорились").contains("Wool Crew");
        NegotiationContext ky = new NegotiationContext("Wool Crew", "", new BigDecimal("10.00"), 10, "Арзаныраак болобу?", List.of(), "ky", List.of(), List.of());
        Negotiator.Proposal k = negotiator.propose(ky);
        assertThat(k.discountPct()).isEqualByComparingTo("14");
        assertThat(k.replyTemplate()).contains("10 жуп");
        assertThat(negotiator.propose(new NegotiationContext("x", "", BigDecimal.TEN, 1, "Оптом можно?", List.of(), "ru", List.of(), List.of())).discountPct())
                .isEqualByComparingTo("3");
    }

    @Test
    void russianPairsFollowTheNumber() {
        assertThat(Replies.pairs(1, "ru")).isEqualTo("1 пару");
        assertThat(Replies.pairs(3, "ru")).isEqualTo("3 пары");
        assertThat(Replies.pairs(12, "ru")).isEqualTo("12 пар");
        assertThat(Replies.pairs(22, "ru")).isEqualTo("22 пары");
        assertThat(Replies.pairs(1, "en")).isEqualTo("1 pair");
        assertThat(Replies.language("kg")).isEqualTo("ky");
        assertThat(Replies.language(null)).isEqualTo("en");
    }
}
