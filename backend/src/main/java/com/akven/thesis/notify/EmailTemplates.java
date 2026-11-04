package com.akven.thesis.notify;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The words of the emails, in English, Russian and Kyrgyz (resources/notify/emails_*.properties). A missing text
 * falls back to English, so a new sentence never leaves a blank in an email.
 */
@Component
public class EmailTemplates {

    public static final List<String> LANGS = List.of("en", "ru", "ky");
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{([a-zA-Z]+)}");

    private final Map<String, Properties> texts = Map.of("en", load("en"), "ru", load("ru"), "ky", load("ky"));

    private static Properties load(String lang) {
        Properties p = new Properties();
        try (InputStream in = EmailTemplates.class.getResourceAsStream("/notify/emails_" + lang + ".properties")) {
            if (in == null) throw new IllegalStateException("Missing email texts for " + lang);
            p.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return p;
    }

    /** The text for this key in this language with its {placeholders} filled in; values are inserted as they are. */
    public String text(String lang, String key, Map<String, ?> values) {
        String raw = texts.getOrDefault(lang, texts.get("en")).getProperty(key, texts.get("en").getProperty(key));
        if (raw == null) throw new IllegalArgumentException("No email text " + key);
        Matcher m = PLACEHOLDER.matcher(raw);
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            Object v = values.get(m.group(1));
            m.appendReplacement(out, Matcher.quoteReplacement(v == null ? "" : String.valueOf(v)));
        }
        m.appendTail(out);
        return out.toString();
    }

    public String text(String lang, String key) {
        return text(lang, key, Map.of());
    }

    /** Every key of every language, for the test that keeps the three languages complete. */
    Map<String, Properties> all() {
        return texts;
    }
}
