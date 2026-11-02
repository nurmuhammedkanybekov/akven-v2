    private PricedLine decide(Variant variant, BigDecimal tier, BigDecimal negotiated, UUID sessionId) {
        BigDecimal list = variant.getPrice();
        boolean offerWins = negotiated.compareTo(tier) > 0;
        BigDecimal wanted = offerWins ? negotiated : tier;
        BigDecimal pct = policyValidator.clamp(wanted, variant);
        DiscountSource source = pct.signum() == 0 ? DiscountSource.NONE : offerWins ? DiscountSource.NEGOTIATED : DiscountSource.TIER;
        BigDecimal unit = list.multiply(BigDecimal.valueOf(100).subtract(pct)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        // The offer stays linked even when the tier was better: it was presented at checkout and is used up with this order.
        return new PricedLine(list, pct, unit, sessionId, tier, source, pct.compareTo(wanted) < 0);
    }
