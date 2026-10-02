package com.akven.thesis.common;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

/** Turns a display name into a URL-safe slug: "Mid-Long Socks!" becomes "mid-long-socks". */
public final class Slugs {

    private Slugs() {
    }

    public static String of(String name) {
        String plain = Normalizer.normalize(name, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        String slug = plain.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        if (slug.length() > 80) {
            slug = slug.substring(0, 80).replaceAll("-+$", "");
        }
        return slug;
    }

    /** First free slug for the name: "sport", then "sport-2", "sport-3"... Names with no Latin letters fall back to "item". */
    public static String unique(String name, Predicate<String> taken) {
        String base = of(name);
        if (base.isEmpty()) {
            base = "item";
        }
        String candidate = base;
        for (int n = 2; taken.test(candidate); n++) {
            candidate = base + "-" + n;
        }
        return candidate;
    }
}
