package com.akven.thesis.negotiation;

import com.akven.thesis.settings.Settings;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** The switch picks the assistant per message; a missing or failing model always leaves the rules answering. */
class SwitchingNegotiatorTest {

    private static final NegotiationContext CTX = new NegotiationContext("Wool Crew", null, new BigDecimal("10.00"), 1, "hello");
    private final Negotiator model = c -> new Negotiator.Proposal(BigDecimal.ONE, "From the model.", "llm");

    private static AssistantSwitch switchSaying(String stored, String provider) {
        Settings settings = mock(Settings.class);
        when(settings.get(Settings.ASSISTANT_MODE)).thenReturn(Optional.ofNullable(stored));
        return new AssistantSwitch(settings, provider);
    }

    @Test
    void theStoredChoiceWinsOverTheEnvironment() {
        assertThat(new SwitchingNegotiator(new RuleBasedNegotiator(), new AiAssistant(model, "m", "h"), switchSaying("ai", "rule")).propose(CTX).source()).isEqualTo("llm");
        assertThat(new SwitchingNegotiator(new RuleBasedNegotiator(), new AiAssistant(model, "m", "h"), switchSaying("rules", "llm")).propose(CTX).source()).isEqualTo("rules");
        assertThat(new SwitchingNegotiator(new RuleBasedNegotiator(), new AiAssistant(model, "m", "h"), switchSaying(null, "llm")).propose(CTX).source()).isEqualTo("llm");
        assertThat(switchSaying("nonsense", "rule").mode()).isEqualTo("rules");
    }

    @Test
    void withoutAModelOrWhenItFailsTheRulesAnswer() {
        assertThat(new SwitchingNegotiator(new RuleBasedNegotiator(), new AiAssistant(null, "m", "h"), switchSaying("ai", "llm")).propose(CTX).source()).isEqualTo("rules");
        Negotiator broken = c -> { throw new IllegalStateException("down"); };
        assertThat(new SwitchingNegotiator(new RuleBasedNegotiator(), new AiAssistant(broken, "m", "h"), switchSaying("ai", "rule")).propose(CTX).source()).isEqualTo("rules-fallback");
    }

    @Test
    void aHostedModelNeedsAKeyButALocalOneDoesNot() {
        java.time.Duration t = java.time.Duration.ofSeconds(1);
        assertThat(AiAssistant.from("https://generativelanguage.googleapis.com/v1beta/openai", "", "m", t).configured()).isFalse();
        assertThat(AiAssistant.from("https://generativelanguage.googleapis.com/v1beta/openai", "k", "m", t).configured()).isTrue();
        assertThat(AiAssistant.from("http://localhost:11434/v1", "", "llama3.2", t).configured()).isTrue();
        assertThat(AiAssistant.from("https://generativelanguage.googleapis.com/v1beta/openai", "k", "m", t).endpointHost()).isEqualTo("generativelanguage.googleapis.com");
    }
}
