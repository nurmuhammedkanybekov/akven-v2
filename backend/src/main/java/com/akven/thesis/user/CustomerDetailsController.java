package com.akven.thesis.user;

import com.akven.thesis.user.CustomerDetailsService.DetailsInput;
import com.akven.thesis.user.CustomerDetailsService.DetailsView;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** The signed-in customer's own saved details: read, save, forget. */
@RestController
@RequestMapping("/api/account/details")
public class CustomerDetailsController {

    private final CustomerDetailsService service;

    public CustomerDetailsController(CustomerDetailsService service) {
        this.service = service;
    }

    @GetMapping
    public DetailsView mine(Authentication auth) {
        return service.mine(auth.getName());
    }

    @PutMapping
    public DetailsView save(Authentication auth, @Valid @RequestBody DetailsInput input) {
        return service.save(auth.getName(), input);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forget(Authentication auth) {
        service.forget(auth.getName());
    }
}
