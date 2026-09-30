package com.akven.thesis.support;

import com.akven.thesis.catalog.Category;
import com.akven.thesis.catalog.Product;
import com.akven.thesis.catalog.ProductRepository;
import com.akven.thesis.catalog.Variant;
import com.akven.thesis.catalog.VariantRepository;
import com.akven.thesis.negotiation.NegotiationSession;
import com.akven.thesis.negotiation.NegotiationSessionRepository;
import com.akven.thesis.user.Role;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/** Builds throw-away catalog items, customers and negotiation offers with unique names, so tests never collide. */
@Component
public class OrderTestData {

    @Autowired private ProductRepository products;
    @Autowired private VariantRepository variants;
    @Autowired private UserRepository users;
    @Autowired private NegotiationSessionRepository sessions;

    /** A fresh product with one variant: price 10.00, cost 4.00, biggest discount 15%. */
    public Variant variant(int stock) {
        return variant(stock, "10.00", "15.00");
    }

    public Variant variant(int stock, String price, String marginFloorPct) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        Product p = products.save(new Product("order-it-" + id, "Order Test Sock " + id, Category.MEN, null, null, "OrderIt", "d", "cotton"));
        Variant v = new Variant(p, "OT-" + id.toUpperCase(), "M", "Navy", 1, new BigDecimal(price), new BigDecimal("4.00"), new BigDecimal(marginFloorPct));
        v.setColorHex("#1F2A44");
        v.setStockQty(stock);
        return variants.saveAndFlush(v);
    }

    public Variant reload(Variant v) {
        return variants.findById(v.getId()).orElseThrow();
    }

    public User customer(String email) {
        return users.findByEmail(email).orElseGet(() -> users.save(new User(email, "x", Role.CUSTOMER)));
    }

    /** A negotiation result as the assistant module will leave it: what it proposed and what the policy allowed. */
    public NegotiationSession offer(User customer, Variant variant, String proposedPct, String validatedPct) {
        NegotiationSession s = new NegotiationSession(customer, variant);
        s.recordOutcome("test transcript", new BigDecimal(proposedPct), new BigDecimal(validatedPct));
        return sessions.saveAndFlush(s);
    }
}
