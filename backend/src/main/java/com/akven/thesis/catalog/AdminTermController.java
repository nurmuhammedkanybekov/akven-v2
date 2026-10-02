package com.akven.thesis.catalog;

import com.akven.thesis.catalog.AdminCatalogDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Manage the catalog's sections and cuts. Thin on purpose: rules and auditing live in AdminTermService. */
@RestController
@RequestMapping("/api/admin/terms")
public class AdminTermController {

    private final AdminTermService service;

    public AdminTermController(AdminTermService service) {
        this.service = service;
    }

    @GetMapping
    public List<AdminTermView> list(@RequestParam TermKind kind) {
        return service.list(kind);
    }

    @PostMapping
    public ResponseEntity<AdminTermView> create(Authentication auth, @Valid @RequestBody CreateTermRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(auth.getName(), body));
    }

    @PutMapping("/{id}")
    public AdminTermView update(Authentication auth, @PathVariable UUID id, @Valid @RequestBody UpdateTermRequest body) {
        return service.update(auth.getName(), id, body);
    }

    @PostMapping("/reorder")
    public List<AdminTermView> reorder(Authentication auth, @Valid @RequestBody ReorderTermsRequest body) {
        return service.reorder(auth.getName(), body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable UUID id) {
        service.delete(auth.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
