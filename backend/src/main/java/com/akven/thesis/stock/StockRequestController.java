package com.akven.thesis.stock;

import com.akven.thesis.stock.StockRequestService.Waiting;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** "Tell me when it is back" for customers, and the waiting list for the shop team. */
@RestController
public class StockRequestController {

    private final StockRequestService service;

    public StockRequestController(StockRequestService service) {
        this.service = service;
    }

    @GetMapping("/api/stock-requests")
    public List<String> mine(Authentication auth) {
        return service.mine(auth.getName());
    }

    @PutMapping("/api/stock-requests/{sku}")
    public List<String> request(Authentication auth, @PathVariable String sku) {
        return service.request(auth.getName(), sku);
    }

    @DeleteMapping("/api/stock-requests/{sku}")
    public List<String> cancel(Authentication auth, @PathVariable String sku) {
        return service.cancel(auth.getName(), sku);
    }

    @GetMapping("/api/admin/stock-requests")
    public List<Waiting> waiting() {
        return service.waiting();
    }

    @PutMapping("/api/admin/stock-requests/{id}/answered")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void answered(Authentication auth, @PathVariable UUID id) {
        service.markNotified(auth.getName(), id);
    }
}
