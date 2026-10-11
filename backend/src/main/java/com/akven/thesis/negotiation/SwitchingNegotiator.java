package com.akven.thesis.negotiation;

/**
 * The assistant behind the chat: the language model (falling back to the rules on any failure) when the switch says
 * ai and a model is configured, the rules otherwise. Whatever answers, the PolicyValidator clamps it afterwards.
 */
public class SwitchingNegotiator implements Negotiator {

    private final Negotiator rules;
    private final Negotiator aiWithFallback;
    private final AssistantSwitch assistantSwitch;

    public SwitchingNegotiator(Negotiator rules, AiAssistant ai, AssistantSwitch assistantSwitch) {
        this.rules = rules;
        this.aiWithFallback = ai.configured() ? new FallbackNegotiator(ai.negotiator(), rules) : null;
        this.assistantSwitch = assistantSwitch;
    }

    @Override
    public Proposal propose(NegotiationContext context) {
        boolean ai = aiWithFallback != null && AssistantSwitch.AI.equals(assistantSwitch.mode());
        return (ai ? aiWithFallback : rules).propose(context);
    }
}
