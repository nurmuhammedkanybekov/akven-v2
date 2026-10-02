package com.akven.thesis.negotiation;

import com.akven.thesis.negotiation.NegotiationDtos.NegotiateRequest;
import com.akven.thesis.negotiation.NegotiationDtos.NegotiateResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * The customer's chat. Needs a signed-in customer, because an offer belongs to a person and can only be used
 * by them (see PricingService). The response carries only validated numbers.
 */
@RestController
@RequestMapping("/api/negotiate")
public class NegotiationController {

    private final NegotiationService service;

    public NegotiationController(NegotiationService service) {
        this.service = service;
    }

    @PostMapping
    public NegotiateResponse negotiate(Authentication auth, @Valid @RequestBody NegotiateRequest body) {
        return service.negotiate(auth.getName(), body);
    }
}
