package com.akven.thesis.family;

import com.akven.thesis.family.FamilyDtos.FamilyRequest;
import com.akven.thesis.family.FamilyDtos.MemberView;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** The signed-in customer's family: read it, or save the whole list at once. */
@RestController
public class FamilyController {

    private final FamilyService service;

    public FamilyController(FamilyService service) {
        this.service = service;
    }

    @GetMapping("/api/family")
    public List<MemberView> mine(Authentication auth) {
        return service.mine(auth.getName());
    }

    @PutMapping("/api/family")
    public List<MemberView> save(Authentication auth, @Valid @RequestBody FamilyRequest request) {
        return service.replace(auth.getName(), request.members());
    }
}
