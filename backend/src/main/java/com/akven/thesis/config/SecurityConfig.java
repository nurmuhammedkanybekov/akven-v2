package com.akven.thesis.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * RBAC shape for the API (FR-9, NFR-2): one filter chain serves both the
 * customer storefront and the admin panel, gated by role — not two
 * services. Catalog reads and auth (register/login) are public; everything
 * else needs a token; /api/admin/** additionally needs STAFF or ADMIN.
 * Finer-grained rules that don't fit a URL pattern (e.g. "STAFF can edit
 * price but not marginFloorPct" — FR-11) belong on the service methods via
 * @PreAuthorize, which @EnableMethodSecurity turns on below.
 *
 * Milestone 2: JwtAuthenticationFilter now actually verifies tokens (see
 * that class) and authenticationManager is backed by a real
 * UserDetailsService (UserDetailsServiceImpl) + the PasswordEncoder bean
 * below — Spring Boot auto-configures the DaoAuthenticationProvider from
 * those two beans, so nothing else needs to change here for that to work.
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
            // Without an explicit entry point, Spring Security answers an unauthenticated request with
            // 403 (Http403ForbiddenEntryPoint) when no formLogin/httpBasic is configured. REST semantics
            // are 401 = "no valid token", 403 = "valid token, wrong role" — so say so explicitly.
            .exceptionHandling(eh -> eh.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                // Live API docs (OpenApiConfig) — documentation, not data, so no auth required.
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                // Registration and login must be reachable without a token; everything else
                // under /api/auth/** (e.g. /api/auth/me) stays behind anyRequest().authenticated().
                .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers("/api/admin/**").hasAnyRole("STAFF", "ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
