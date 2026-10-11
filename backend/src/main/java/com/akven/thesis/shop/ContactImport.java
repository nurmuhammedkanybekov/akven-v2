package com.akven.thesis.shop;

import com.akven.thesis.settings.Settings;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

/**
 * Loads the shop's real contacts from the environment (SHOP_CONTACTS), so phone numbers live in an ignored .env file
 * and the database, never in the repository. The list replaces the contacts once; after that the owners edit them in
 * the admin, and the list is applied again only when it changes. The values themselves are never logged.
 *
 * Format: entries separated by ";", each "KIND|label|value", for example
 * {@code WHATSAPP|Akylbek|+996700123456;FACEBOOK|Facebook|https://www.facebook.com/akven.socks}. The order is the
 * order on the site.
 */
@Component
public class ContactImport implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ContactImport.class);

    private final ShopContactRepository contacts;
    private final Settings settings;
    private final String spec;

    public ContactImport(ShopContactRepository contacts, Settings settings, @Value("${akven.shop.contacts:}") String spec) {
        this.contacts = contacts;
        this.settings = settings;
        this.spec = spec == null ? "" : spec.strip();
    }

    @Override
    public void run(ApplicationArguments args) {
        apply();
    }

    /** @return how many contacts were written, or -1 when there was nothing new to apply. */
    @Transactional
    public int apply() {
        if (spec.isEmpty()) return -1;
        String fingerprint = sha256(spec);
        if (settings.get(Settings.CONTACTS_IMPORTED).filter(fingerprint::equals).isPresent()) return -1;

        List<ShopContact> parsed = parse(spec);
        if (parsed.isEmpty()) {
            log.warn("SHOP_CONTACTS is set but has no valid entry; the contacts were left as they are.");
            return 0;
        }
        contacts.deleteAllInBatch();
        contacts.saveAll(parsed);
        settings.put(Settings.CONTACTS_IMPORTED, fingerprint);
        log.info("Shop contacts loaded from SHOP_CONTACTS: {} entries.", parsed.size());
        return parsed.size();
    }

    static List<ShopContact> parse(String spec) {
        List<ShopContact> out = new ArrayList<>();
        String[] entries = spec.split("[;\\n]");
        for (int i = 0; i < entries.length; i++) {
            String entry = entries[i].strip();
            if (entry.isEmpty()) continue;
            String[] parts = entry.split("\\|", -1);
            if (parts.length != 3) {
                log.warn("SHOP_CONTACTS entry {} is not KIND|label|value and was skipped.", i + 1);
                continue;
            }
            ContactKind kind;
            try {
                kind = ContactKind.valueOf(parts[0].strip().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                log.warn("SHOP_CONTACTS entry {} has an unknown kind and was skipped.", i + 1);
                continue;
            }
            String value = kind.normalise(parts[2]);
            if (!kind.isValid(value)) {
                log.warn("SHOP_CONTACTS entry {} ({}) is not {} and was skipped.", i + 1, kind, kind.hint());
                continue;
            }
            String label = parts[1].strip();
            out.add(new ShopContact(kind, label.isEmpty() ? null : label, value, out.size(), true));
        }
        return out;
    }

    private static String sha256(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
