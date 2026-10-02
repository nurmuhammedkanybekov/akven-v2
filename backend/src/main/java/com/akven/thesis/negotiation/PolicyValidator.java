package com.akven.thesis.negotiation;

import com.akven.thesis.catalog.Variant;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;

/**
 * The safety gate described in the architecture doc: the ONLY code allowed to
 * turn a proposed discount into something that can touch an order. Deliberately
 * plain, deterministic, and independent of the LLM call — treat whatever the
 * negotiation service hands in as untrusted input, the same way you'd never
 * trust a client-submitted price.
 */
@Component
public class PolicyValidator {

    /**
     * @param proposedDiscountPct what the LLM suggested — never trusted directly.
     * @param variant the SKU being negotiated, whose marginFloorPct is the hard limit.
     * @return the discount actually allowed: min(proposed, marginFloorPct), never negative.
     */
    public BigDecimal clamp(BigDecimal proposedDiscountPct, Variant variant) {
        if (proposedDiscountPct == null || proposedDiscountPct.signum() < 0) {
            return BigDecimal.ZERO;
        }
        return proposedDiscountPct.min(variant.getMarginFloorPct());
    }
}
