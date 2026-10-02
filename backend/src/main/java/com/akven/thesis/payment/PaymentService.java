package com.akven.thesis.payment;

import com.akven.thesis.common.BusinessRuleException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.regex.Pattern;

/**
 * The single door to payment. Before any provider sees a token, it must have the exact shape of a wallet token
 * for the chosen method. Anything else is refused, and something that looks like a card number is refused with
 * a clear message, so raw card data can neither be stored nor logged by accident (FR-8).
 */
@Service
public class PaymentService {

    private static final Pattern APPLE = Pattern.compile("sim_apple_[A-Za-z0-9]{12,64}");
    private static final Pattern GOOGLE = Pattern.compile("sim_google_[A-Za-z0-9]{12,64}");
    private static final Pattern LOOKS_LIKE_A_CARD = Pattern.compile("[0-9][0-9 \\-]{11,}");

    private final List<PaymentProvider> providers;

    public PaymentService(List<PaymentProvider> providers) {
        this.providers = providers;
    }

    public PaymentResult charge(PaymentRequest request) {
        requireWellFormedToken(request.method(), request.token());
        return providerFor(request.method()).charge(request);
    }

    public void refund(PaymentMethod method, String paymentReference, BigDecimal amount) {
        providerFor(method).refund(paymentReference, amount);
    }

    static void requireWellFormedToken(PaymentMethod method, String token) {
        if (token == null || token.isBlank()) {
            throw new BusinessRuleException("Payment could not be started. Please try again.");
        }
        if (LOOKS_LIKE_A_CARD.matcher(token.trim()).matches()) {
            throw new BusinessRuleException("Card numbers are never accepted here. Pay with Apple Pay or Google Pay.");
        }
        Pattern expected = method == PaymentMethod.APPLE_PAY ? APPLE : GOOGLE;
        if (!expected.matcher(token).matches()) {
            throw new BusinessRuleException("The payment token was not recognised. Please try again.");
        }
    }

    private PaymentProvider providerFor(PaymentMethod method) {
        return providers.stream().filter(p -> p.supports(method)).findFirst()
                .orElseThrow(() -> new BusinessRuleException("That payment method is not available."));
    }
}
