package com.akven.thesis.payment;

import com.akven.thesis.common.BusinessRuleException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.regex.Pattern;
import java.util.Map;

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

    /** Whether customers may reserve and pay at handover (cash or bank app at the stall, or to the courier). */
    private final boolean payAtHandover;

    @Autowired
    public PaymentService(ObjectProvider<PaymentProvider> providers,
                          @org.springframework.beans.factory.annotation.Value("${akven.payments.pay-at-handover:true}") boolean payAtHandover) {
        this(providers.orderedStream().toList(), payAtHandover);
    }

    public PaymentService(List<PaymentProvider> providers) {
        this(providers, true);
    }

    public PaymentService(List<PaymentProvider> providers, boolean payAtHandover) {
        this.providers = List.copyOf(providers);
        this.payAtHandover = payAtHandover;
    }

    public boolean payAtHandover() { return payAtHandover; }

    /** How this installation takes payments, for the shop to tell its customers: none set up, a demo, or real. */
    public PaymentMode mode() {
        if (providers.isEmpty()) return PaymentMode.NONE;
        return providers.stream().anyMatch(PaymentProvider::simulated) ? PaymentMode.SIMULATED : PaymentMode.LIVE;
    }

    /** Refuses a checkout before anything is reserved when no provider can take this method. */
    public void requireAvailable(PaymentMethod method) {
        if (!method.online()) {
            if (!payAtHandover) {
                throw new BusinessRuleException("PAYMENT_METHOD_UNAVAILABLE", Map.of(), "That payment method is not available.");
            }
            return;
        }
        if (providers.isEmpty()) {
            throw new BusinessRuleException("PAYMENT_NOT_SET_UP", Map.of(), "Online payment is not set up in this shop yet.");
        }
        providerFor(method);
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
            throw new BusinessRuleException("PAYMENT_NOT_STARTED", Map.of(), "Payment could not be started. Please try again.");
        }
        if (LOOKS_LIKE_A_CARD.matcher(token.trim()).matches()) {
            throw new BusinessRuleException("PAYMENT_NO_CARDS", Map.of(), "Card numbers are never accepted here. Pay with Apple Pay or Google Pay.");
        }
        Pattern expected = method == PaymentMethod.APPLE_PAY ? APPLE : GOOGLE;
        if (!expected.matcher(token).matches()) {
            throw new BusinessRuleException("PAYMENT_TOKEN_INVALID", Map.of(), "The payment token was not recognised. Please try again.");
        }
    }

    private PaymentProvider providerFor(PaymentMethod method) {
        return providers.stream().filter(p -> p.supports(method)).findFirst()
                .orElseThrow(() -> new BusinessRuleException("PAYMENT_METHOD_UNAVAILABLE", Map.of(), "That payment method is not available."));
    }
}
