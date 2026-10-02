package com.akven.thesis.negotiation;

import java.math.BigDecimal;
import java.util.List;

/**
 * Everything the assistant is allowed to know about the item it negotiates. Cost price and margin floor are
 * deliberately NOT here: a model that never sees the floor cannot leak it, and the type makes that impossible to
 * undo by accident. The floor is applied afterwards, by the PolicyValidator, to whatever the assistant proposes.
 *
 * @param facts short product facts (fabric, care, origin ...) retrieved for this question, for the assistant to quote.
 */
public record NegotiationContext(String productName, String variantLabel, BigDecimal listPrice, int quantity,
                                 String customerMessage, List<String> facts) {

    public NegotiationContext {
        facts = facts == null ? List.of() : List.copyOf(facts);
    }

    public NegotiationContext(String productName, String variantLabel, BigDecimal listPrice, int quantity, String customerMessage) {
        this(productName, variantLabel, listPrice, quantity, customerMessage, List.of());
    }
}
