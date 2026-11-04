package com.akven.thesis.order;

import com.akven.thesis.config.InstallationKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * The private link to an order, for customers without an account: /orders/{id}#t={token}. The token is an HMAC of the
 * order id under this installation's secret (JWT_SECRET, or the key the shop made itself), so it is never stored,
 * cannot be guessed, and the same link can be sent again. It sits after the "#", which browsers never send to a
 * server, so it does not end up in access logs; the page sends it in the X-Order-Token header.
 */
@Component
public class OrderLinks {

    private final Supplier<byte[]> secret;

    public OrderLinks(@Value("${akven.jwt.secret:}") String jwtSecret, InstallationKey installationKey) {
        String s = jwtSecret == null ? "" : jwtSecret.strip();
        this.secret = s.isEmpty() ? installationKey::get : () -> s.getBytes(StandardCharsets.UTF_8);
    }

    public String tokenFor(UUID orderId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            // A key of its own, derived from the secret: an order link can never be used as a login token, or the reverse.
            mac.init(new SecretKeySpec(MessageDigest.getInstance("SHA-256").digest(concat("akven-order-link:".getBytes(StandardCharsets.UTF_8), secret.get())), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(orderId.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Compared in constant time, so the answer's timing tells nothing about how close a guess was. */
    public boolean opens(UUID orderId, String token) {
        if (token == null || token.isBlank() || token.length() > 100) return false;
        return MessageDigest.isEqual(tokenFor(orderId).getBytes(StandardCharsets.US_ASCII), token.strip().getBytes(StandardCharsets.US_ASCII));
    }

    private static byte[] concat(byte[] a, byte[] b) {
        byte[] out = new byte[a.length + b.length];
        System.arraycopy(a, 0, out, 0, a.length);
        System.arraycopy(b, 0, out, a.length, b.length);
        return out;
    }
}
