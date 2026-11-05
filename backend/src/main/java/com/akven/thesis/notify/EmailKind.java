package com.akven.thesis.notify;

/** What an email is about: to a customer, or (LOW_STOCK) to the owners. */
public enum EmailKind {
    /** The order is paid: what was bought, the total, the pickup code or where it goes. */
    ORDER_CONFIRMED,
    /** Collected at the stall, on its way with the courier, or with the cargo carrier. */
    ORDER_HANDED_OVER,
    /** A paid order was cancelled, by the customer or by the shop, and the money returned. */
    ORDER_CANCELLED,
    /** The private link to an order, sent again because the customer asked for it. */
    ORDER_LINK,
    /** A wholesale request that gave an email address as the way to answer. */
    WHOLESALE_RECEIVED,
    /** To the owners: a sale has left one or more socks at or below the "few left" level. */
    LOW_STOCK
}
