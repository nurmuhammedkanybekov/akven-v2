package com.akven.thesis.order;

import com.akven.thesis.payment.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Request and response shapes of the cart and order API. Note what requests do NOT contain: a price.
 * The client says which item and how many; the server decides what it costs.
 */
public final class OrderDtos {

    private OrderDtos() {
    }

    // ---- requests ---------------------------------------------------------------------------

    public record CartItem(@NotBlank @Size(max = 64) String sku,
                           @NotNull @Min(1) @Max(99) Integer quantity,
                           UUID negotiationSessionId) {}

    public record QuoteRequest(@NotEmpty @Size(max = 50) List<@Valid CartItem> items) {}

    public record FulfillmentInput(@NotNull FulfillmentMethod method,
                                   @NotBlank @Size(max = 120) String contactName,
                                   @NotBlank @Pattern(regexp = "[0-9+()\\-\\s]{6,40}", message = "enter a phone number") String contactPhone,
                                   @Size(max = 300) String address,
                                   @Size(max = 500) String note) {}

    /** The wallet token only. There is deliberately no field for a card number. */
    public record PaymentInput(@NotNull PaymentMethod method, @NotBlank @Size(max = 128) String token) {}

    public record CheckoutRequest(@NotEmpty @Size(max = 50) List<@Valid CartItem> items,
                                  @NotNull @Valid FulfillmentInput fulfillment,
                                  @NotNull @Valid PaymentInput payment) {}

    // ---- cart quote (public) ----------------------------------------------------------------

    public enum LineProblem { NONE, UNAVAILABLE, SOLD_OUT, NOT_ENOUGH_STOCK }

    public record QuoteLine(String sku, String productSlug, String productName, String variantLabel, String colorHex,
                            String imageUrl, int quantity, BigDecimal listPrice, BigDecimal discountPct, BigDecimal unitPrice,
                            BigDecimal lineTotal, int availableQty, LineProblem problem, String note) {}

    public record Quote(List<QuoteLine> lines, BigDecimal total, boolean canCheckout) {}

    // ---- orders -----------------------------------------------------------------------------

    public record OrderItemView(String sku, String productName, String productSlug, String variantLabel, String colorHex,
                                String imageUrl, int quantity, BigDecimal listPrice, BigDecimal discountPct,
                                BigDecimal unitPrice, BigDecimal lineTotal) {}

    public record FulfillmentView(FulfillmentMethod method, String contactName, String contactPhone, String address, String note) {}

    /** The payment reference is shown shortened: enough for a support call, not the whole token of the provider. */
    public record PaymentView(String method, String reference) {}

    public record OrderView(UUID id, String reference, OrderStatus status, BigDecimal total, Instant createdAt,
                            Instant paidAt, Instant fulfilledAt, Instant cancelledAt, FulfillmentView fulfillment,
                            PaymentView payment, List<OrderItemView> items, String customerEmail) {}
}
