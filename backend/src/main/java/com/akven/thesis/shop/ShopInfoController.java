package com.akven.thesis.shop;

import com.akven.thesis.shop.ShopDtos.ContactRequest;
import com.akven.thesis.shop.ShopDtos.ContactView;
import com.akven.thesis.shop.ShopDtos.PickupPointRequest;
import com.akven.thesis.shop.ShopDtos.PickupPointView;
import com.akven.thesis.shop.ShopDtos.ShopInfo;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Public shop information, and the owners' editing of it (ADMIN only, enforced in ShopInfoService). */
@RestController
public class ShopInfoController {

    private final ShopInfoService service;

    public ShopInfoController(ShopInfoService service) {
        this.service = service;
    }

    @GetMapping("/api/shop/info")
    public ShopInfo info() {
        return service.publicInfo();
    }

    @GetMapping("/api/admin/shop/contacts")
    public List<ContactView> contacts() {
        return service.allContacts();
    }

    @PostMapping("/api/admin/shop/contacts")
    @ResponseStatus(HttpStatus.CREATED)
    public ContactView createContact(Authentication auth, @Valid @RequestBody ContactRequest request) {
        return service.createContact(auth.getName(), request);
    }

    @PutMapping("/api/admin/shop/contacts/{id}")
    public ContactView updateContact(Authentication auth, @PathVariable UUID id, @Valid @RequestBody ContactRequest request) {
        return service.updateContact(auth.getName(), id, request);
    }

    @DeleteMapping("/api/admin/shop/contacts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteContact(Authentication auth, @PathVariable UUID id) {
        service.deleteContact(auth.getName(), id);
    }

    @GetMapping("/api/admin/shop/pickup-points")
    public List<PickupPointView> pickupPoints() {
        return service.allPickupPoints();
    }

    @PostMapping("/api/admin/shop/pickup-points")
    @ResponseStatus(HttpStatus.CREATED)
    public PickupPointView createPickupPoint(Authentication auth, @Valid @RequestBody PickupPointRequest request) {
        return service.createPickupPoint(auth.getName(), request);
    }

    @PutMapping("/api/admin/shop/pickup-points/{id}")
    public PickupPointView updatePickupPoint(Authentication auth, @PathVariable UUID id, @Valid @RequestBody PickupPointRequest request) {
        return service.updatePickupPoint(auth.getName(), id, request);
    }
}
