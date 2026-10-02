package com.akven.thesis.negotiation;

import com.akven.thesis.common.PageResponse;
import com.akven.thesis.negotiation.NegotiationDtos.SessionView;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** The shop team reviews what the assistant offered and what the policy allowed (FR-12). STAFF or ADMIN. */
@RestController
@RequestMapping("/api/admin/negotiations")
public class AdminNegotiationController {

    private final NegotiationService service;

    public AdminNegotiationController(NegotiationService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse<SessionView> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int pageSize) {
        return service.list(page, pageSize);
    }

    @GetMapping("/{id}")
    public SessionView get(@PathVariable UUID id) {
        return service.get(id);
    }
}
