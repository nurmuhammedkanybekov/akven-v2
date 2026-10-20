package com.akven.thesis.order;

import com.akven.thesis.common.PageResponse;
import com.akven.thesis.order.OrderDtos.HandoverRequest;
import com.akven.thesis.order.OrderDtos.OrderView;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Orders for the shop team. The URL rule (STAFF or ADMIN) is repeated on the service methods. */
@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final OrderService service;
    private final OrderExport export;

    public AdminOrderController(OrderService service, OrderExport export) {
        this.service = service;
        this.export = export;
    }

    /** The orders of the last N days as a spreadsheet file (ADMIN, audited). */
    @GetMapping(value = "/export", produces = "text/csv")
    public org.springframework.http.ResponseEntity<String> export(Authentication auth, @RequestParam(defaultValue = "90") int days) {
        String file = "akven-orders-" + java.time.LocalDate.now(com.akven.thesis.catalog.CatalogService.SHOP_ZONE) + ".csv";
        return org.springframework.http.ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + file + "\"")
                .contentType(org.springframework.http.MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(export.csv(auth.getName(), days));
    }

    @GetMapping
    public PageResponse<OrderView> list(@RequestParam(required = false) OrderStatus status,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int pageSize) {
        return service.list(status, page, pageSize);
    }

    @GetMapping("/{id}")
    public OrderView get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping("/handover")
    public OrderView handOver(Authentication auth, @Valid @RequestBody HandoverRequest request) {
        return service.handOver(auth.getName(), request.code(), request.phoneEnd());
    }

    @PostMapping("/{id}/fulfil")
    public OrderView fulfil(Authentication auth, @PathVariable UUID id) {
        return service.fulfil(auth.getName(), id);
    }

    @PostMapping("/{id}/cancel")
    public OrderView cancel(Authentication auth, @PathVariable UUID id) {
        return service.cancelAsStaff(auth.getName(), id);
    }
}
