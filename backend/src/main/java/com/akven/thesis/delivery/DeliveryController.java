package com.akven.thesis.delivery;

import com.akven.thesis.delivery.DeliveryDtos.ZoneInput;
import com.akven.thesis.delivery.DeliveryDtos.ZoneView;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Delivery areas: public for the checkout, edited by the owners (ADMIN, enforced in DeliveryService). */
@RestController
public class DeliveryController {

    private final DeliveryService service;

    public DeliveryController(DeliveryService service) {
        this.service = service;
    }

    @GetMapping("/api/shop/delivery-zones")
    public List<ZoneView> zones() {
        return service.publicZones();
    }

    @GetMapping("/api/admin/delivery-zones")
    public List<ZoneView> all() {
        return service.allZones();
    }

    @PostMapping("/api/admin/delivery-zones")
    @ResponseStatus(HttpStatus.CREATED)
    public ZoneView create(Authentication auth, @Valid @RequestBody ZoneInput input) {
        return service.create(auth.getName(), input);
    }

    @PutMapping("/api/admin/delivery-zones/{id}")
    public ZoneView update(Authentication auth, @PathVariable UUID id, @Valid @RequestBody ZoneInput input) {
        return service.update(auth.getName(), id, input);
    }

    @DeleteMapping("/api/admin/delivery-zones/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication auth, @PathVariable UUID id) {
        service.delete(auth.getName(), id);
    }
}
