package com.akven.thesis.negotiation;

import java.util.Locale;
import java.util.Map;

/**
 * Everything the shop itself says in the chat, in English, Russian and Kyrgyz. These are templates: {pct} and {price}
 * are filled in with the validated numbers only, and {product} and {qty} with the item and the pairs asked for.
 */
public final class Replies {

    private Replies() {
    }

    public static final String EN = "en", RU = "ru", KY = "ky";

    /** Any unknown or missing language is English. */
    public static String language(String raw) {
        String l = raw == null ? "" : raw.strip().toLowerCase(Locale.ROOT);
        return l.startsWith("ru") ? RU : l.startsWith("ky") || l.startsWith("kg") ? KY : EN;
    }

    public enum Key { CAPPED, NO_DISCOUNT, SAFE_OFFER, WELCOME, DEAL, OFFER }

    private static final Map<Key, Map<String, String>> TEXT = Map.of(
            Key.CAPPED, Map.of(
                    EN, "That is the best I can do on this one: {pct}% off, {price} a pair. It is already close to what the bazaar lets me give.",
                    RU, "Это лучшее, что я могу предложить: скидка {pct}%, {price} за пару. Ниже базар мне уже не позволяет.",
                    KY, "Бул эң жакшы баам: {pct}% арзандатуу, жубу {price}. Мындан төмөн базар уруксат бербейт."),
            Key.NO_DISCOUNT, Map.of(
                    EN, "I cannot go below the list price on this one, {price} a pair. A bigger order or a bundle may open up a better price.",
                    RU, "На эту модель я не могу опуститься ниже цены: {price} за пару. Больше пар в заказе, и цена станет лучше.",
                    KY, "Бул байпакты баасынан арзан бере албайм: жубу {price}. Көбүрөөк алсаңыз, баасы жакшыраак болот."),
            Key.SAFE_OFFER, Map.of(
                    EN, "For you, {pct}% off: {price} a pair.",
                    RU, "Для вас скидка {pct}%: {price} за пару.",
                    KY, "Сизге {pct}% арзандатуу: жубу {price}."),
            Key.WELCOME, Map.of(
                    EN, "Welcome! These are {price} a pair. Tell me how many you need, or what price you have in mind, and we will see what I can do.",
                    RU, "Добро пожаловать! Цена {price} за пару. Скажите, сколько пар нужно или какую цену вы хотите, и я посмотрю, что можно сделать.",
                    KY, "Кош келиңиз! Жубу {price}. Канча жуп керек экенин же кандай баа каалаганыңызды айтыңыз, мен карап көрөйүн."),
            Key.DEAL, Map.of(
                    EN, "Deal, {product} at {pct}% off: {price} a pair. Add it to your bag and it is yours.",
                    RU, "Договорились: {product} со скидкой {pct}%, {price} за пару. Добавьте в корзину, и они ваши.",
                    KY, "Макул: {product}, {pct}% арзандатуу менен, жубу {price}. Себетке салыңыз, сиздики."),
            Key.OFFER, Map.of(
                    EN, "For you, {pct}% off: {price} a pair. That is my price for {qty}.",
                    RU, "Для вас скидка {pct}%: {price} за пару. Это моя цена за {qty}.",
                    KY, "Сизге {pct}% арзандатуу: жубу {price}. Бул {qty} үчүн менин баам."));

    public static String get(Key key, String language) {
        Map<String, String> byLanguage = TEXT.get(key);
        return byLanguage.getOrDefault(language(language), byLanguage.get(EN));
    }

    /** "1 pair", "5 pairs"; in Russian the noun follows the number's ending. */
    public static String pairs(int n, String language) {
        return switch (language(language)) {
            case RU -> {
                int mod10 = n % 10, mod100 = n % 100;
                String word = mod10 == 1 && mod100 != 11 ? "пару" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "пары" : "пар";
                yield n + " " + word;
            }
            case KY -> n + " жуп";
            default -> n + (n == 1 ? " pair" : " pairs");
        };
    }
}
