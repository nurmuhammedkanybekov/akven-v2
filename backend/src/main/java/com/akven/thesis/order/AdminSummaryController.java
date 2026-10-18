package com.akven.thesis.order;

import com.akven.thesis.order.ShopSummaryService.ShopSummary;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Sales and running-out stock for the dashboard. STAFF or ADMIN, checked on the service. */
@RestController
@RequestMapping("/api/admin/summary")
public class AdminSummaryController {

    private final ShopSummaryService service;

    public AdminSummaryController(ShopSummaryService service) {
        this.service = service;
    }

    @GetMapping
    public ShopSummary summary(@RequestParam(defaultValue = "30") int days) {
        return service.summary(days);
    }
}
