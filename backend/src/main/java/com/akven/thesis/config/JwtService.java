package com.akven.thesis.config;

import com.akven.thesis.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.function.Supplier;

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
 * The signing key is JWT_SECRET when it is set (a random value of at least 32 bytes). Without it, each installation
 * makes its own random key on first use and keeps it in its database (InstallationKey). A key written in the code or
 * the repository is never used: anyone who has read the repository could otherwise forge an owner's token.
 */
@Component
public class JwtService {

    /** The old built-in development value. Refused everywhere: it is public, in the repository's history. */
    static final String DEV_SECRET_PREFIX = "dev-only-insecure";

    private final Supplier<byte[]> keySource;
    private volatile SecretKey signingKey;
    private final long expirationMinutes;

    @Autowired
    public JwtService(@Value("${akven.jwt.secret:}") String secret,
                      @Value("${akven.jwt.expiration-minutes}") long expirationMinutes,
                      InstallationKey installationKey) {
        this(secret, expirationMinutes, installationKey::get);
    }

    JwtService(String secret, long expirationMinutes, Supplier<byte[]> installationKey) {
        String s = secret == null ? "" : secret.strip();
        if (s.startsWith(DEV_SECRET_PREFIX)) {
            throw new IllegalStateException("JWT_SECRET is the old public development value. Remove it (the shop then makes its own key) "
                    + "or set a random value of at least 32 bytes (openssl rand -base64 48).");
        }
        if (!s.isEmpty() && s.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes long (openssl rand -base64 48).");
        }
        this.keySource = s.isEmpty() ? installationKey : () -> s.getBytes(StandardCharsets.UTF_8);
        this.expirationMinutes = expirationMinutes;
    }

    /** Read once, on first use: the installation key lives in the database, which is not ready while beans are built. */
    private SecretKey key() {
        SecretKey k = signingKey;
        if (k == null) {
            synchronized (this) {
                if (signingKey == null) signingKey = Keys.hmacShaKeyFor(keySource.get());
                k = signingKey;
            }
        }
        return k;
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("uid", user.getId().toString())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
                .signWith(key())
                .compact();
    }

    /**
     * @throws JwtException if the token is malformed, expired, or the signature doesn't verify.
     *                       Callers (JwtAuthenticationFilter) treat that as "no valid session" —
     *                       never as a reason to fail the request themselves.
     */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
