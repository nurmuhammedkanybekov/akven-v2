package com.akven.thesis.order;

import com.akven.thesis.order.OrderDtos.Quote;
import com.akven.thesis.order.OrderDtos.QuoteRequest;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public: a visitor with no account can see what their cart costs right now (the cart itself lives in the browser). */
@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cart;
    private final UserRepository users;

    public CartController(CartService cart, UserRepository users) {
        this.cart = cart;
        this.users = users;
    }

    @PostMapping("/quote")
    public Quote quote(Authentication auth, @Valid @RequestBody QuoteRequest body) {
        User customer = auth == null || auth instanceof AnonymousAuthenticationToken || !auth.isAuthenticated()
                ? null : users.findByEmail(auth.getName()).orElse(null);
        return cart.quote(body.items(), customer);
    }
}
