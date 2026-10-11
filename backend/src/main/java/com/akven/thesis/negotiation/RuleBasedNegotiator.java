package com.akven.thesis.negotiation;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.akven.thesis.negotiation.Replies.Key;

/**
 * A deterministic assistant, used when the language model is switched off or fails. It reads the message the way a
 * market seller would, in English, Russian or Kyrgyz: an explicit percentage is taken as the ask, otherwise buying more
 * or mentioning bundles earns a better price. It agrees to explicit asks without looking at any limit, on purpose: that
 * is what lets the tests and the defence demo show the PolicyValidator catching an over-generous assistant.
 */
public class RuleBasedNegotiator implements Negotiator {

    private static final Pattern PERCENT = Pattern.compile("(\\d{1,3}(?:[.,]\\d{1,2})?)\\s*(?:%|percent|per cent|процент|пайыз)", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern BULK = Pattern.compile("\\b(bundle|bulk|wholesale|pairs|dozen|carton|lot)\\b|опт|коробк|ящик|дүң|көп");
    private static final Pattern HAGGLE = Pattern.compile("\\b(discount|cheaper|cheap|deal|lower|best price|reduce|offer|less)\\b|скидк|дешевл|уступ|сбавь|арзан|түшүр|жеңилдик");

    @Override
    public Proposal propose(NegotiationContext ctx) {
        String text = ctx.customerMessage() == null ? "" : ctx.customerMessage().toLowerCase(Locale.ROOT);
        String lang = ctx.language();

        Matcher percent = PERCENT.matcher(text);
        if (percent.find()) {
            BigDecimal asked = new BigDecimal(percent.group(1).replace(',', '.')).min(BigDecimal.valueOf(100));
            return new Proposal(asked, Replies.get(Key.DEAL, lang).replace("{product}", ctx.productName()));
        }

        BigDecimal pct = BigDecimal.ZERO;
        if (ctx.quantity() >= 10) pct = new BigDecimal("12");
        else if (ctx.quantity() >= 5) pct = new BigDecimal("8");
        else if (ctx.quantity() >= 3) pct = new BigDecimal("5");
        if (BULK.matcher(text).find()) pct = pct.add(new BigDecimal("3"));
        if (HAGGLE.matcher(text).find()) pct = pct.add(new BigDecimal("2"));

        if (pct.signum() == 0) {
            return new Proposal(BigDecimal.ZERO, Replies.get(Key.WELCOME, lang));
        }
        return new Proposal(pct, Replies.get(Key.OFFER, lang).replace("{qty}", Replies.pairs(ctx.quantity(), lang)));
    }
}
