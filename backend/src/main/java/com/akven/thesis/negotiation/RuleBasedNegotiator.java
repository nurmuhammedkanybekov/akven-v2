package com.akven.thesis.negotiation;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A deterministic stand-in for the language model, used until the real assistant is connected. It reads the message
 * the way a market seller would: an explicit percentage is taken as the ask, otherwise buying more or mentioning
 * bundles earns a better price. It agrees to explicit asks without looking at any limit, on purpose: that is what
 * lets the tests and the defence demo show the PolicyValidator catching an over-generous assistant.
 */
public class RuleBasedNegotiator implements Negotiator {

    private static final Pattern PERCENT = Pattern.compile("(\\d{1,3}(?:[.,]\\d{1,2})?)\\s*(?:%|percent|per cent)", Pattern.CASE_INSENSITIVE);
    private static final Pattern BULK = Pattern.compile("\\b(bundle|bulk|wholesale|pairs|dozen|carton|lot)\\b");
    private static final Pattern HAGGLE = Pattern.compile("\\b(discount|cheaper|cheap|deal|lower|best price|reduce|offer|less)\\b");

    @Override
    public Proposal propose(NegotiationContext ctx) {
        String text = ctx.customerMessage() == null ? "" : ctx.customerMessage().toLowerCase(Locale.ROOT);

        Matcher percent = PERCENT.matcher(text);
        if (percent.find()) {
            BigDecimal asked = new BigDecimal(percent.group(1).replace(',', '.')).min(BigDecimal.valueOf(100));
            return new Proposal(asked, "Deal, " + ctx.productName() + " at {pct}% off: {price} a pair. Add it to your bag and it is yours.");
        }

        BigDecimal pct = BigDecimal.ZERO;
        if (ctx.quantity() >= 10) pct = new BigDecimal("12");
        else if (ctx.quantity() >= 5) pct = new BigDecimal("8");
        else if (ctx.quantity() >= 3) pct = new BigDecimal("5");
        if (BULK.matcher(text).find()) pct = pct.add(new BigDecimal("3"));
        if (HAGGLE.matcher(text).find()) pct = pct.add(new BigDecimal("2"));

        if (pct.signum() == 0) {
            return new Proposal(BigDecimal.ZERO,
                    "Welcome! These are {price} a pair. Tell me how many you need, or what price you have in mind, and we will see what I can do.");
        }
        return new Proposal(pct, "For you, {pct}% off: {price} a pair. That is my price for " + ctx.quantity() + (ctx.quantity() == 1 ? " pair." : " pairs."));
    }
}
