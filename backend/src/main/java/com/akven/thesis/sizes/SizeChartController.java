package com.akven.thesis.sizes;

import com.akven.thesis.sizes.SizeDtos.Chart;
import com.akven.thesis.sizes.SizeDtos.Match;
import com.akven.thesis.sizes.SizeDtos.RowRequest;
import com.akven.thesis.sizes.SizeDtos.RowView;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.UUID;

/** Public size chart and size finder; owners edit the rows (ADMIN only, enforced in SizeChartService). */
@RestController
public class SizeChartController {

    private final SizeChartService service;

    public SizeChartController(SizeChartService service) {
        this.service = service;
    }

    @GetMapping("/api/sizes")
    public Chart chart(@RequestParam(defaultValue = "en") String lang) {
        return service.chart(lang);
    }

    @GetMapping("/api/sizes/find")
    public Match find(@RequestParam SizeSystem system, @RequestParam BigDecimal size) {
        return service.find(system, size);
    }

    @PostMapping("/api/admin/sizes")
    @ResponseStatus(HttpStatus.CREATED)
    public RowView create(Authentication auth, @Valid @RequestBody RowRequest request) {
        return service.create(auth.getName(), request);
    }

    @PutMapping("/api/admin/sizes/{id}")
    public RowView update(Authentication auth, @PathVariable UUID id, @Valid @RequestBody RowRequest request) {
        return service.update(auth.getName(), id, request);
    }

    @DeleteMapping("/api/admin/sizes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication auth, @PathVariable UUID id) {
        service.delete(auth.getName(), id);
    }
}
