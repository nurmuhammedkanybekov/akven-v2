package com.akven.thesis.negotiation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Asks the main assistant, and if it fails for any reason the customer still gets an answer from the rule-based one. */
public class FallbackNegotiator implements Negotiator {

    private static final Logger log = LoggerFactory.getLogger(FallbackNegotiator.class);

    private final Negotiator primary;
    private final Negotiator fallback;

    public FallbackNegotiator(Negotiator primary, Negotiator fallback) {
        this.primary = primary;
        this.fallback = fallback;
    }

    @Override
    public Proposal propose(NegotiationContext context) {
        try {
            return primary.propose(context);
        } catch (RuntimeException e) {
            log.warn("Language model unavailable, using the rule-based assistant: {}", e.getMessage());   // never the customer's text or any key
            Proposal p = fallback.propose(context);
            return new Proposal(p.discountPct(), p.replyTemplate(), "rules-fallback");
        }
    }
}
