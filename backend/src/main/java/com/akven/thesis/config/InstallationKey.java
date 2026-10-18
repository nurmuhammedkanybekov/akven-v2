package com.akven.thesis.config;

import com.akven.thesis.settings.Settings;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * This installation's own token signing key, for when no JWT_SECRET is set: 48 random bytes made on the first start
 * and kept in the database (app_setting), so tokens survive a restart and no two installations share a key. It is
 * never logged or shown. Anyone who can read the database could forge a token, but they could also change it directly.
 */
@Component
public class InstallationKey {

    static final String SETTING = "jwt.signing-key";

    private final Settings settings;

    public InstallationKey(Settings settings) {
        this.settings = settings;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public synchronized byte[] get() {
        String stored = settings.get(SETTING).orElse(null);
        if (stored == null) {
            byte[] fresh = new byte[48];
            new SecureRandom().nextBytes(fresh);
            stored = Base64.getEncoder().encodeToString(fresh);
            settings.put(SETTING, stored);
        }
        return Base64.getDecoder().decode(stored);
    }
}
