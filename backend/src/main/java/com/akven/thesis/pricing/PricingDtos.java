package com.akven.thesis.pricing;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Shapes of the pricing API. The public view holds only what a customer may see: the minimum and the ladder. */
public final class PricingDtos {

    private PricingDtos() {
    }

    public record PolicyRequest(@NotNull @Min(1) @Max(10000) Integer minOrderPairs,
                                @NotNull @Min(1) @Max(10000) Integer trustedMinOrderPairs,
                                @NotNull @Min(1) @Max(1000) Integer trustedAfterOrders,
                                @Min(0) @Max(10000) Integer fewLeftThreshold,
                                @DecimalMin(value = "0.01") @DecimalMax(value = "100000") BigDecimal somPerUsd,
                                Integer somRounding,
                                @DecimalMin(value = "0.01") @DecimalMax(value = "100000") BigDecimal rubPerUsd,
                                Integer rubRounding) {}

    /** fewLeftThreshold: the shop says "only N left" at or below this many units. */
    public record PolicyView(int minOrderPairs, int trustedMinOrderPairs, int trustedAfterOrders, int fewLeftThreshold,
                             BigDecimal somPerUsd, int somRounding, BigDecimal rubPerUsd, int rubRounding) {

        static PolicyView of(ShopPolicy p) {
            return new PolicyView(p.getMinOrderPairs(), p.getTrustedMinOrderPairs(), p.getTrustedAfterOrders(), p.getFewLeftThreshold(),
                    p.getSomPerUsd(), p.getSomRounding(), p.getRubPerUsd(), p.getRubRounding());
        }
    }

    public record TierRequest(@NotNull @Min(1) @Max(100000) Integer minPairs,
                              @NotNull @DecimalMin("0") @DecimalMax("90") @Digits(integer = 2, fraction = 2) BigDecimal discountPct) {}

    public record TierView(UUID id, int minPairs, BigDecimal discountPct) {

        static TierView of(PriceTier t) {
            return new TierView(t.getId(), t.getMinPairs(), t.getDiscountPct());
        }
    }

    public record PublicTier(int minPairs, BigDecimal discountPct) {}

    /** The som and rouble rates and roundings let the shop show every price in those currencies, rounded the owners' way. */
    public record PublicPricing(int minOrderPairs, List<PublicTier> tiers, BigDecimal somPerUsd, int somRounding,
                                BigDecimal rubPerUsd, int rubRounding) {}

    public record TrustRequest(@NotNull Boolean trusted) {}

    public record TrustView(UUID customerId, boolean trusted) {}
}
