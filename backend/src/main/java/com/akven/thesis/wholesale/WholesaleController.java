package com.akven.thesis.wholesale;

import com.akven.thesis.wholesale.WholesaleDtos.HandleInput;
import com.akven.thesis.wholesale.WholesaleDtos.Inbox;
import com.akven.thesis.wholesale.WholesaleDtos.InboxLine;
import com.akven.thesis.wholesale.WholesaleDtos.Received;
import com.akven.thesis.wholesale.WholesaleDtos.RequestInput;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Wholesale and company requests: sent from the wholesale page (no account needed), handled in the admin inbox. */
@RestController
public class WholesaleController {

    private final WholesaleService service;

    public WholesaleController(WholesaleService service) {
        this.service = service;
    }

    @PostMapping("/api/wholesale/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public Received submit(@Valid @RequestBody RequestInput input, HttpServletRequest http, Authentication auth) {
        String account = auth == null || auth instanceof AnonymousAuthenticationToken ? null : auth.getName();
        return service.submit(input, http.getRemoteAddr(), account);
    }

    @GetMapping("/api/admin/wholesale")
    public Inbox inbox(@RequestParam(required = false) WholesaleStatus status) {
        return service.inbox(status);
    }

    @PutMapping("/api/admin/wholesale/{id}")
    public InboxLine handle(Authentication auth, @PathVariable UUID id, @Valid @RequestBody HandleInput input) {
        return service.handle(auth.getName(), id, input);
    }
}
