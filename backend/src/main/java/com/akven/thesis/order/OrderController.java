package com.akven.thesis.order;

import com.akven.thesis.common.BusinessRuleException;
import com.akven.thesis.order.OrderDtos.CheckoutRequest;
import com.akven.thesis.order.OrderDtos.OrderView;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

/** A signed-in customer's checkout and order history. Another customer's order is indistinguishable from a missing one. */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Pattern KEY = Pattern.compile("[A-Za-z0-9-]{16,64}");

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    /**
     * The Idempotency-Key header is a fresh random value the browser creates for each checkout attempt. Sending the
     * same key again (double click, network retry) returns the same order with 200 instead of placing another one.
     */
    @PostMapping
    public ResponseEntity<OrderView> checkout(Authentication auth,
                                              @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                              @Valid @RequestBody CheckoutRequest body) {
        if (key == null || !KEY.matcher(key).matches()) {
            throw new BusinessRuleException("Missing or invalid Idempotency-Key header.");
        }
        OrderService.CheckoutResult result = service.checkout(auth.getName(), key, body);
        return ResponseEntity.status(result.replayed() ? HttpStatus.OK : HttpStatus.CREATED).body(result.order());
    }

    @GetMapping
    public List<OrderView> mine(Authentication auth) {
        return service.myOrders(auth.getName());
    }

    @GetMapping("/{id}")
    public OrderView one(Authentication auth, @PathVariable UUID id) {
        return service.myOrder(auth.getName(), id);
    }

    @PostMapping("/{id}/cancel")
    public OrderView cancel(Authentication auth, @PathVariable UUID id) {
        return service.cancelMine(auth.getName(), id);
    }
}
