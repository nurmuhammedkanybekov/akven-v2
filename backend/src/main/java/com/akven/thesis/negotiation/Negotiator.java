package com.akven.thesis.negotiation;

import java.math.BigDecimal;

/**
 * The assistant behind the chat. Milestone 2 ships a rule-based stand-in; Milestone 3 replaces it with an LLM that
 * uses retrieval over the product knowledge base. The contract stays the same, so nothing else changes.
 * An implementation is never trusted: whatever it returns is clamped by the PolicyValidator.
 */
public interface Negotiator {

    /**
     * @param discountPct   the discount the assistant wants to give, in percent. May be anything, including too much.
     * @param replyTemplate what to say. It may contain {pct} and {price}, which are filled in with the VALIDATED
     *                      discount and price, so the customer never reads a number the policy did not approve.
     */
    record Proposal(BigDecimal discountPct, String replyTemplate) {}

    Proposal propose(NegotiationContext context);
}
