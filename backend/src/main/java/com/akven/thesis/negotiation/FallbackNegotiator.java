package com.akven.thesis.negotiation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Asks the main assistant, and if it fails for any reason the customer still gets an answer from the rule-based one. */
public class FallbackNegotiator implements Negotiator {

    private static final Logger log = LoggerFactory.getLogger(FallbackNegotiator.class);

    private final Negotiator primary;
    private final Negotiator fallback;

    /** The last time the model answered, and the last time it failed and why: shown to the super admin, never to customers. */
    private static volatile java.time.Instant lastOkAt;
    private static volatile java.time.Instant lastFailureAt;
    private static volatile String lastFailure;

    public static java.time.Instant lastOkAt() { return lastOkAt; }
    public static java.time.Instant lastFailureAt() { return lastFailureAt; }
    public static String lastFailure() { return lastFailure; }
    static void recordOk() { lastOkAt = java.time.Instant.now(); }
    static void recordFailure(String why) { lastFailure = why; lastFailureAt = java.time.Instant.now(); }

    public FallbackNegotiator(Negotiator primary, Negotiator fallback) {
        this.primary = primary;
        this.fallback = fallback;
    }

    @Override
    public Proposal propose(NegotiationContext context) {
        try {
            Proposal p = primary.propose(context);
            recordOk();
            return p;
        } catch (RuntimeException e) {
            recordFailure(e.getMessage());
            log.warn("Language model unavailable, using the rule-based assistant: {}", e.getMessage());   // never the customer's text or any key
            Proposal p = fallback.propose(context);
            return new Proposal(p.discountPct(), p.replyTemplate(), "rules-fallback");
        }
    }
}
