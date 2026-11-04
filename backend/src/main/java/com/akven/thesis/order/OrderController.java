package com.akven.thesis.order;

import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.order.OrderDtos.CheckoutRequest;
import com.akven.thesis.order.OrderDtos.FindRequest;
import com.akven.thesis.order.OrderDtos.OrderView;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Checkout and the customer's orders, with or without an account. A guest opens their order with the token of its
 * private link (X-Order-Token). Another customer's order is indistinguishable from a missing one.
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Pattern KEY = Pattern.compile("[A-Za-z0-9-]{16,64}");

    private final OrderService service;
    private final GuestLimiter limiter;

    public OrderController(OrderService service, GuestLimiter limiter) {
        this.service = service;
        this.limiter = limiter;
    }

    private static String user(Authentication auth) {
        return auth == null || auth instanceof AnonymousAuthenticationToken ? null : auth.getName();
    }

    /**
     * The Idempotency-Key header is a fresh random value the browser creates for each checkout attempt. Sending the
     * same key again (double click, network retry) returns the same order with 200 instead of placing another one.
     */
    @PostMapping
    public ResponseEntity<OrderView> checkout(Authentication auth, HttpServletRequest http,
                                              @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                              @Valid @RequestBody CheckoutRequest body) {
        if (key == null || !KEY.matcher(key).matches()) {
            throw new BusinessRuleException("Missing or invalid Idempotency-Key header.");
        }
        String customer = user(auth);
        if (customer == null) limiter.checkout(http.getRemoteAddr());
        OrderService.CheckoutResult result = service.checkout(customer, key, body);
        return ResponseEntity.status(result.replayed() ? HttpStatus.OK : HttpStatus.CREATED).body(result.order());
    }

    /** The signed-in customer's orders (guests have one link per order instead). */
    @GetMapping
    public List<OrderView> mine(Authentication auth) {
        return service.myOrders(auth.getName());
    }

    @GetMapping("/{id}")
    public OrderView one(Authentication auth, @PathVariable UUID id, @RequestHeader(value = "X-Order-Token", required = false) String token) {
        return service.myOrder(user(auth), id, token);
    }

    @PostMapping("/{id}/cancel")
    public OrderView cancel(Authentication auth, @PathVariable UUID id, @RequestHeader(value = "X-Order-Token", required = false) String token) {
        return service.cancelMine(user(auth), id, token);
    }

    /** Sends the order's link to its email again. Always the same answer, whether or not anything matched. */
    @PostMapping("/find")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void find(HttpServletRequest http, @Valid @RequestBody FindRequest body) {
        limiter.find(http.getRemoteAddr());
        service.sendLinkAgain(body);
    }
}
