package com.akven.thesis.saved;

import com.akven.thesis.catalog.CatalogViews.ProductSummary;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** The signed-in customer's saved socks. */
@RestController
@RequestMapping("/api/saved")
public class SavedController {

    private final SavedService service;

    public SavedController(SavedService service) {
        this.service = service;
    }

    public record MergeRequest(@NotNull @Size(max = SavedService.MAX) List<@Pattern(regexp = "[a-z0-9][a-z0-9-]{0,99}") String> slugs) {}

    @GetMapping
    public List<ProductSummary> mine(Authentication auth) {
        return service.mine(auth.getName());
    }

    @PutMapping("/{slug}")
    public List<ProductSummary> save(Authentication auth, @PathVariable String slug) {
        return service.save(auth.getName(), slug);
    }

    @DeleteMapping("/{slug}")
    public List<ProductSummary> remove(Authentication auth, @PathVariable String slug) {
        return service.remove(auth.getName(), slug);
    }

    @PostMapping("/merge")
    public List<ProductSummary> merge(Authentication auth, @Valid @RequestBody MergeRequest request) {
        return service.merge(auth.getName(), request.slugs());
    }
}
