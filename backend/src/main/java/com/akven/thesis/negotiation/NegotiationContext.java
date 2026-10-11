package com.akven.thesis.negotiation;

import java.math.BigDecimal;
import java.util.List;

/**
 * Everything the assistant is allowed to know about the item it negotiates. Cost price and margin floor are
 * deliberately NOT here: a model that never sees the floor cannot leak it, and the type makes that impossible to
 * undo by accident. The floor is applied afterwards, by the PolicyValidator, to whatever the assistant proposes.
 *
 * @param facts     short product facts (fabric, care, origin ...) retrieved for this question, for the assistant to quote.
 * @param language  the customer's language: en, ru or ky (see Replies).
 * @param history   what was already said in this conversation, oldest first, with the offer the customer was shown.
 * @param shopTerms public shop rules worth knowing in a bargain: the price ladder, the minimum order, stock.
 */
public record NegotiationContext(String productName, String variantLabel, BigDecimal listPrice, int quantity,
                                 String customerMessage, List<String> facts, String language, List<Turn> history,
                                 List<String> shopTerms) {

    /** One earlier exchange: what the customer wrote, what the shop answered, and the discount it stood for. */
    public record Turn(String customer, String reply, BigDecimal discountPct) {}

    public NegotiationContext {
        facts = facts == null ? List.of() : List.copyOf(facts);
        history = history == null ? List.of() : List.copyOf(history);
        shopTerms = shopTerms == null ? List.of() : List.copyOf(shopTerms);
        language = Replies.language(language);
    }

    public NegotiationContext(String productName, String variantLabel, BigDecimal listPrice, int quantity, String customerMessage, List<String> facts) {
        this(productName, variantLabel, listPrice, quantity, customerMessage, facts, Replies.EN, List.of(), List.of());
    }

    public NegotiationContext(String productName, String variantLabel, BigDecimal listPrice, int quantity, String customerMessage) {
        this(productName, variantLabel, listPrice, quantity, customerMessage, List.of());
    }
}
