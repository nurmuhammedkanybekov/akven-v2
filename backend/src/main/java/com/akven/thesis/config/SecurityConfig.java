package com.akven.thesis.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * RBAC shape for the API (FR-9, NFR-2): one filter chain serves both the
 * customer storefront and the admin panel, gated by role — not two
 * services. Catalog reads are public; everything else needs a token;
 * /api/admin/** additionally needs STAFF or ADMIN. Finer-grained rules that
 * don't fit a URL pattern (e.g. "STAFF can edit price but not marginFloorPct" —
 * FR-11) belong on the service methods via @PreAuthorize, which
 * @EnableMethodSecurity turns on below.
 *
 * TODO (Phase 2, before Milestone 2): once the auth endpoints exist, wire
 * JwtAuthenticationFilter's actual token verification (see that class) and
 * point authenticationManager at a real UserDetailsService backed by
 * UserRepository. Until then this chain is structurally correct but nothing
 * can actually authenticate, so every non-public route 401s rather than
 * silently allowing access — the safe failure mode for a skeleton.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthFilter) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // stateless JWT API — no cookie-based session to protect
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                // Live API docs (OpenApiConfig) — documentation, not data, so no auth required.
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                .requestMatchers("/api/admin/**").hasAnyRole("STAFF", "ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
