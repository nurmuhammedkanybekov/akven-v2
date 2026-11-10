package com.akven.thesis.stock;

/** Why a variant's stock changed. The database accepts exactly these (V41). */
public enum StockReason {
    /** The count when the ledger started, or when a new variant was added with stock. */
    OPENING,
    /** Goods arrived (a delivery from Korea). */
    RECEIVED,
    /** A paid order took the pairs off the shelf. */
    SALE,
    /** A paid order was cancelled and the pairs went back on the shelf. */
    CANCELLED,
    /** Someone counted the shelf and set the number by hand. */
    CORRECTION
}
