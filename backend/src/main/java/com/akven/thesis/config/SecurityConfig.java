package com.akven.thesis.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Placeholder security config — permits everything so the skeleton runs.
 *
 * TODO (before Milestone 2): port the JWT filter, RBAC rules and password
 * hashing from the Nevis IAM & Audit Logging project instead of writing this
 * from scratch. Target shape: CUSTOMER can hit /api/products and
 * /api/negotiate; STAFF/ADMIN additionally get /api/admin/**; everything
 * else requires a valid JWT.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // TODO: re-enable for admin-facing form endpoints once they exist
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
