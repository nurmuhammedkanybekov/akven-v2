package com.akven.thesis.shop;

import java.util.regex.Pattern;

/** The ways customers can reach the shop. Each kind knows what a valid value looks like and how to link to it. */
public enum ContactKind {

    INSTAGRAM("[A-Za-z0-9._]{1,30}", "an Instagram name such as akven.socks") {
        @Override String link(String v) { return "https://instagram.com/" + v; }
    },
    TELEGRAM("[A-Za-z0-9_]{5,32}", "a Telegram username such as nurmss4") {
        @Override String link(String v) { return "https://t.me/" + v; }
    },
    WHATSAPP("\\+[0-9]{8,15}", "a phone number in international form, such as +996700123456") {
        @Override String link(String v) { return "https://wa.me/" + v.substring(1); }
    },
    PHONE("\\+[0-9]{8,15}", "a phone number in international form, such as +996700123456") {
        @Override String link(String v) { return "tel:" + v; }
    },
    EMAIL("[^@\\s]{1,64}@[^@\\s]{1,100}\\.[A-Za-z]{2,24}", "an email address") {
        @Override String link(String v) { return "mailto:" + v; }
    };

    private final Pattern pattern;
    private final String hint;

    ContactKind(String regex, String hint) {
        this.pattern = Pattern.compile(regex);
        this.hint = hint;
    }

    /** Spaces, dashes and brackets are dropped from phone numbers, and a leading @ from handles. */
    String normalise(String raw) {
        String v = raw == null ? "" : raw.trim();
        return switch (this) {
            case WHATSAPP, PHONE -> v.replaceAll("[\\s()\\-]", "");
            case INSTAGRAM, TELEGRAM -> v.startsWith("@") ? v.substring(1) : v;
            case EMAIL -> v;
        };
    }

    boolean isValid(String normalised) {
        return pattern.matcher(normalised).matches();
    }

    String hint() {
        return hint;
    }

    abstract String link(String normalised);
}
