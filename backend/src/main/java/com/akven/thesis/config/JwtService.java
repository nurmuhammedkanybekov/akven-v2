package com.akven.thesis.config;

import com.akven.thesis.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

/**
 * Issues and verifies the JWTs that carry a user's identity and role across
 * requests (FR-9 / NFR-2 — one token type for both the customer storefront
 * and the admin panel; SecurityConfig's per-route rules do the actual
 * role-gating downstream of whatever this class puts in the SecurityContext).
 *
 * The token's subject is the user's email (matching UserDetailsServiceImpl's
 * username, so Authentication#getName() means the same thing everywhere);
 * the user's id and role travel as claims.
 *
 * The signing key comes from akven.jwt.secret (env JWT_SECRET). The default
 * in application.yml is dev-only — override it with a real random 32+ byte
 * secret before this runs anywhere but a laptop; see docs/architecture.md's
 * Security section.
 */
@Component
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMinutes;

    public JwtService(@Value("${akven.jwt.secret}") String secret,
                       @Value("${akven.jwt.expiration-minutes}") long expirationMinutes) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = expirationMinutes;
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("uid", user.getId().toString())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
                .signWith(signingKey)
                .compact();
    }

    /**
     * @throws JwtException if the token is malformed, expired, or the signature doesn't verify.
     *                       Callers (JwtAuthenticationFilter) treat that as "no valid session" —
     *                       never as a reason to fail the request themselves.
     */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
