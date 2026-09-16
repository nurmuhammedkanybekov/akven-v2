package com.akven.thesis.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Stub — verifies nothing yet. Wired into SecurityConfig's filter chain now
 * so the shape of where the JWT check plugs in is visible in the skeleton
 * from day one, per Milestone 1's "system design" deliverable.
 *
 * TODO (Phase 2, before Milestone 2): parse the Authorization: Bearer
 * header, verify the signature, and populate the SecurityContext with the
 * resulting Authentication (principal = user id, authorities = ROLE_<role>)
 * — port from the Nevis IAM & Audit Logging project's equivalent filter.
 * Until that lands, every request passes through unauthenticated, so any
 * route not explicitly permitAll'd in SecurityConfig correctly 401s.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        chain.doFilter(request, response);
    }
}
