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
    private final NegotiationStatsService stats;
    private final NegotiationEvaluation evaluation;

    public AdminNegotiationController(NegotiationService service, NegotiationStatsService stats, NegotiationEvaluation evaluation) {
        this.service = service;
        this.stats = stats;
        this.evaluation = evaluation;
    }

    /** The owners' dashboard over the last {@code days} days. */
    @GetMapping("/stats")
    public NegotiationStats stats(@RequestParam(defaultValue = "30") int days) {
        return stats.stats(days);
    }

    /** Rule-based assistant against scripted AI answers on the same customers, both through the PolicyValidator. */
    @GetMapping("/evaluation")
    public NegotiationEvaluation.Report evaluation() {
        return evaluation.run();
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
