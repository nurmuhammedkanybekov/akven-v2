package com.akven.thesis.negotiation;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class NegotiationDtos {
    private NegotiationDtos() {}

    public record NegotiateRequest(@NotBlank @Size(max = 64) String variantSku,
                                   @NotBlank @Size(max = 500) String message,
                                   @Min(1) @Max(999) Integer quantity) {}

    /**
     * What the customer gets. proposedDiscountPct is present only when the demo flag is on, so the defence can show
     * the assistant's proposal next to what the policy allowed. In normal operation the field is absent.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record NegotiateResponse(UUID sessionId, String reply, BigDecimal validatedDiscountPct, BigDecimal listPrice,
                                    BigDecimal offerPrice, Instant expiresAt, BigDecimal proposedDiscountPct, PriceOutcome outcome) {}

    /**
     * Why the customer got this price: the assistant's offer as it was, cut down by the shop's limit for this sock,
     * or no discount at all. The customer sees the reason, never the limit itself.
     */
    public enum PriceOutcome { AS_OFFERED, LIMITED_BY_SHOP, LIST_PRICE }

    /** Shop-team view: both numbers, the person and the item. Never carries cost price or margin floor. */
    public record SessionView(UUID id, String customerEmail, String sku, String productName, int quantity,
                              BigDecimal proposedDiscountPct, BigDecimal validatedDiscountPct, boolean clamped,
                              String transcript, Instant createdAt) {}
}
