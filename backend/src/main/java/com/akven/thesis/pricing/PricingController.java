package com.akven.thesis.pricing;

import com.akven.thesis.pricing.PricingDtos.PublicPricing;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public: the minimum order and the price ladder, so the shop can say "add 4 more pairs to save 5%". */
@RestController
public class PricingController {

    private final PricingAdminService service;

    public PricingController(PricingAdminService service) {
        this.service = service;
    }

    @GetMapping("/api/pricing")
    public PublicPricing pricing() {
        return service.publicPricing();
    }
}
