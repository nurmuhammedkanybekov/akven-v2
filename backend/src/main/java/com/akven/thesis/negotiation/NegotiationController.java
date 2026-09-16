package com.akven.thesis.negotiation;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Negotiation chat endpoint — LLM + RAG pipeline is Phase 2 (Oct 21 – Nov 7).
 * Stubbed with 501 for now so the route, and PolicyValidator's place in front
 * of it, are visible in the skeleton from day one.
 */
@RestController
@RequestMapping("/api/negotiate")
public class NegotiationController {

    private final PolicyValidator policyValidator;

    public NegotiationController(PolicyValidator policyValidator) {
        this.policyValidator = policyValidator;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.NOT_IMPLEMENTED)
    public void negotiate(@RequestBody NegotiationRequest request) {
        // TODO Phase 2: call the RAG/LLM pipeline, then policyValidator.clamp(...)
        // before anything is written to a NegotiationSession or an Order.
        throw new UnsupportedOperationException("Negotiation pipeline lands in Phase 2 — see docs/architecture.md");
    }

    public record NegotiationRequest(String variantSku, String message) {}
}
