package com.akven.thesis.negotiation;

import java.math.BigDecimal;

/**
 * Everything the assistant is allowed to know about the item it negotiates. Cost price and margin floor are
 * deliberately NOT here: a model that never sees the floor cannot leak it, and the type makes that impossible to
 * undo by accident. The floor is applied afterwards, by the PolicyValidator, to whatever the assistant proposes.
 */
public record NegotiationContext(String productName, String variantLabel, BigDecimal listPrice, int quantity, String customerMessage) {}
