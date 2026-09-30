package com.akven.thesis.auth;

import com.akven.thesis.config.JwtService;
import com.akven.thesis.user.Role;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

/**
 * Registration and login — every protected route downstream needs the token
 * this issues. Deliberately thin: password verification is delegated to
 * Spring Security's AuthenticationManager (see SecurityConfig and
 * UserDetailsServiceImpl); this controller only turns a successful
 * authentication into a JWT via JwtService.
 *
 * /register is customer self-service only (Role.CUSTOMER, hardcoded) — staff
 * and admin accounts are provisioned by seed data / a future admin-only
 * endpoint, never by public self-registration.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                           AuthenticationManager authenticationManager, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        User user = new User(email, passwordEncoder.encode(request.password()), Role.CUSTOMER);
        userRepository.save(user);
        String token = jwtService.generateToken(user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(token, user.getEmail(), user.getRole().name()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password()));
            // DaoAuthenticationProvider swaps the principal for the UserDetails it loaded,
            // so auth.getName() is the canonical (lowercased) email UserDetailsServiceImpl used.
            User user = userRepository.findByEmail(auth.getName()).orElseThrow();
            String token = jwtService.generateToken(user);
            return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), user.getRole().name()));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /** Lets the frontend re-establish "who's logged in" from a stored token without re-authenticating. */
    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .map(user -> ResponseEntity.ok(new MeResponse(user.getEmail(), user.getRole().name())))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    public record RegisterRequest(@Email @NotBlank String email, @NotBlank @Size(min = 8) String password) {}
    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record AuthResponse(String token, String email, String role) {}
    public record MeResponse(String email, String role) {}
}
