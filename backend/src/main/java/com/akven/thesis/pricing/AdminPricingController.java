package com.akven.thesis.pricing;

import com.akven.thesis.pricing.PricingDtos.PolicyRequest;
import com.akven.thesis.pricing.PricingDtos.PolicyView;
import com.akven.thesis.pricing.PricingDtos.TierRequest;
import com.akven.thesis.pricing.PricingDtos.TierView;
import com.akven.thesis.pricing.PricingDtos.TrustRequest;
import com.akven.thesis.pricing.PricingDtos.TrustView;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.List;
import java.util.UUID;

/** The owners' pricing controls (ADMIN only, enforced in PricingAdminService). */
@RestController
public class AdminPricingController {

    private final PricingAdminService service;

    public AdminPricingController(PricingAdminService service) {
        this.service = service;
    }

    @GetMapping("/api/admin/pricing/policy")
    public PolicyView policy() {
        return service.policy();
    }

    @PutMapping("/api/admin/pricing/policy")
    public PolicyView updatePolicy(Authentication auth, @Valid @RequestBody PolicyRequest request) {
        return service.updatePolicy(auth.getName(), request);
    }

    @GetMapping("/api/admin/pricing/tiers")
    public List<TierView> tiers() {
        return service.tiers();
    }

    @PostMapping("/api/admin/pricing/tiers")
    @ResponseStatus(HttpStatus.CREATED)
    public TierView createTier(Authentication auth, @Valid @RequestBody TierRequest request) {
        return service.createTier(auth.getName(), request);
    }

    @PutMapping("/api/admin/pricing/tiers/{id}")
    public TierView updateTier(Authentication auth, @PathVariable UUID id, @Valid @RequestBody TierRequest request) {
        return service.updateTier(auth.getName(), id, request);
    }

    @DeleteMapping("/api/admin/pricing/tiers/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTier(Authentication auth, @PathVariable UUID id) {
        service.deleteTier(auth.getName(), id);
    }

    @PutMapping("/api/admin/customers/{id}/trusted")
    public TrustView setTrusted(Authentication auth, @PathVariable UUID id, @Valid @RequestBody TrustRequest request) {
        return service.setTrusted(auth.getName(), id, request.trusted());
    }
}
