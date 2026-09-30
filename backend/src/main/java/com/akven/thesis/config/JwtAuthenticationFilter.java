package com.akven.thesis.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Verifies the Authorization: Bearer <token> header (Milestone 2 — this used
 * to be a stub that verified nothing; see the git history for that version).
 *
 * A missing or invalid token is deliberately NOT an error here: it just
 * leaves the SecurityContext empty, so SecurityConfig's per-route rules are
 * what actually 401 an unauthenticated request to a protected endpoint —
 * exactly the same failure mode as before this filter did anything, just
 * now a *valid* token actually authenticates instead of every route always
 * 401ing.
 *
 * Rebuilt for this project's JwtService rather than a direct port of the
 * Nevis IAM filter, since Nevis used session-backed auth in places this
 * project deliberately keeps stateless.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith(BEARER_PREFIX)) {
            try {
                Claims claims = jwtService.parseClaims(header.substring(BEARER_PREFIX.length()));
                String role = claims.get("role", String.class);
                Authentication auth = new UsernamePasswordAuthenticationToken(
                        claims.getSubject(), null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (JwtException | IllegalArgumentException e) {
                // Expired, malformed, or wrong-signature token: don't fail the filter chain from
                // inside a filter (that produces a confusing 500). Leave the context empty and
                // let the normal authorizeHttpRequests rules 401 the request downstream.
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}
