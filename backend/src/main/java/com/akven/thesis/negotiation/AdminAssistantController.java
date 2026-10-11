package com.akven.thesis.negotiation;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** The super admin's assistant controls (see AssistantAdmin). */
@RestController
@RequestMapping("/api/admin/assistant")
public class AdminAssistantController {

    private final AssistantAdmin service;

    public AdminAssistantController(AssistantAdmin service) {
        this.service = service;
    }

    @GetMapping
    public AssistantAdmin.Status status() {
        return service.status();
    }

    @PutMapping
    public AssistantAdmin.Status setMode(Authentication auth, @Valid @RequestBody AssistantAdmin.ModeRequest body) {
        return service.setMode(auth.getName(), body.mode());
    }

    @PostMapping("/try")
    public AssistantAdmin.TryResult tryMessage(@Valid @RequestBody AssistantAdmin.TryRequest body) {
        return service.tryMessage(body);
    }

    @PostMapping("/evaluation")
    public NegotiationEvaluation.Report liveEvaluation() {
        return service.liveEvaluation();
    }
}
