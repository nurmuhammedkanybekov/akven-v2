package com.akven.thesis.user;

import com.akven.thesis.common.PageResponse;
import com.akven.thesis.user.AccountDtos.AccountView;
import com.akven.thesis.user.AccountDtos.AuditView;
import com.akven.thesis.user.AccountDtos.CreateAccount;
import com.akven.thesis.user.AccountDtos.CustomerView;
import com.akven.thesis.user.AccountDtos.ResetPassword;
import com.akven.thesis.user.AccountDtos.UpdateAccount;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Accounts and the audit log (UC-8, UC-9). Who may do what is decided in AccountService. */
@RestController
@RequestMapping("/api/admin")
public class AdminAccountController {

    private final AccountService service;

    public AdminAccountController(AccountService service) {
        this.service = service;
    }

    @GetMapping("/accounts")
    public List<AccountView> team() {
        return service.team();
    }

    @PostMapping("/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    public AccountView create(Authentication auth, @Valid @RequestBody CreateAccount body) {
        return service.create(auth.getName(), body);
    }

    @PutMapping("/accounts/{id}")
    public AccountView update(Authentication auth, @PathVariable UUID id, @Valid @RequestBody UpdateAccount body) {
        return service.update(auth.getName(), id, body);
    }

    @PutMapping("/accounts/{id}/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(Authentication auth, @PathVariable UUID id, @Valid @RequestBody ResetPassword body) {
        service.resetPassword(auth.getName(), id, body.password());
    }

    @GetMapping("/customers")
    public PageResponse<CustomerView> customers(@RequestParam(defaultValue = "") String q,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int pageSize) {
        return service.customers(q, page, pageSize);
    }

    @GetMapping("/audit")
    public PageResponse<AuditView> audit(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int pageSize) {
        return service.auditLog(page, pageSize);
    }
}
