package com.akven.thesis.order;

import com.akven.thesis.common.PageResponse;
import com.akven.thesis.order.OrderDtos.OrderView;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Orders for the shop team. The URL rule (STAFF or ADMIN) is repeated on the service methods. */
@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final OrderService service;

    public AdminOrderController(OrderService service) {
        this.service = service;
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

    @PostMapping("/{id}/fulfil")
    public OrderView fulfil(Authentication auth, @PathVariable UUID id) {
        return service.fulfil(auth.getName(), id);
    }

    @PostMapping("/{id}/cancel")
    public OrderView cancel(Authentication auth, @PathVariable UUID id) {
        return service.cancelAsStaff(auth.getName(), id);
    }
}
