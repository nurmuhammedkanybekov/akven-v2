package com.akven.thesis.negotiation;

import com.akven.thesis.order.DiscountSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** The owners' dashboard: how the assistant is doing and what sells. Never carries cost price or margin floor. */
public record NegotiationStats(int days, List<Day> perDay, Totals totals, List<TopItem> topItems, List<SourceCount> discountSources) {

    /** One day in the shop's time zone. averageDiscountPct is over that day's offers; null on a day without any. */
    public record Day(LocalDate date, int offers, int limitedByShop, BigDecimal averageDiscountPct, int offersUsed) {}

    /**
     * conversionPct: offers that ended up in a paid order. limitedPct: offers the shop's limit cut down, i.e. how often
     * the assistant asked for more than the shop allows.
     */
    public record Totals(int offers, int limitedByShop, BigDecimal limitedPct, BigDecimal averageProposedPct,
                         BigDecimal averageDiscountPct, int offersUsed, BigDecimal conversionPct, BigDecimal negotiatedRevenue) {}

    public record TopItem(String sku, String productName, int pairsSold, BigDecimal revenue) {}

    public record SourceCount(DiscountSource source, int lines) {}
}
