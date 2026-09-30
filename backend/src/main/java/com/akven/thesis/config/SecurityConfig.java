package com.akven.thesis.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.DelegatingRequestMatcherHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

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

    /** Explicit origins only, and no credentials: the JWT travels in a header, not a cookie. */
    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${akven.cors.allowed-origins}") String origins) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).filter(o -> !o.isEmpty()).toList());
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Request-Id"));
        cors.setExposedHeaders(List.of("X-Request-Id", "Retry-After"));
        cors.setAllowCredentials(false);
        cors.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthFilter) throws Exception {
        http
            .cors(Customizer.withDefaults())   // uses the corsConfigurationSource bean below
            .headers(h -> h
                .referrerPolicy(r -> r.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", "camera=(), microphone=(), geolocation=()"))
                // JSON API responses should never be rendered, framed or scripted. Scoped to /api so
                // the Swagger UI page (which does need scripts) keeps working.
                .addHeaderWriter(new DelegatingRequestMatcherHeaderWriter(new AntPathRequestMatcher("/api/**"),
                        new StaticHeadersWriter("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))))
            .csrf(csrf -> csrf.disable()) // stateless JWT API — no cookie-based session to protect
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // Without an explicit entry point, Spring Security answers an unauthenticated request with
            // 403 (Http403ForbiddenEntryPoint) when no formLogin/httpBasic is configured. REST semantics
            // are 401 = "no valid token", 403 = "valid token, wrong role" — so say so explicitly.
            .exceptionHandling(eh -> eh.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                // On a real servlet container a 4xx/5xx is re-dispatched internally to /error, and that
                // second dispatch carries no token. If /error required authentication, every 403 would be
                // rewritten to 401. /error only renders a generic status body, so it is safe to open.
                .requestMatchers("/error").permitAll()
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
