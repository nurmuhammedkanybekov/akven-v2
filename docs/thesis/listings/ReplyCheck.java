    /**
     * A reply is safe when, apart from the shop's placeholders, it states no number, price or percentage, in digits or
     * words, in English, Russian or Kyrgyz. The one exception is the customer's own quantity ("6 pairs", "six pairs",
     * "\u043f\u044f\u0442\u044c \u043f\u0430\u0440", "\u0431\u0435\u0448 \u0436\u0443\u043f"), which is just repeating the question.
     */
    static boolean isSafe(String reply, int quantity, String language) {
        if (reply.isBlank()) return false;
        String lang = Replies.language(language);
        String stripped = reply.replace("{pct}%", " ").replace("{pct}", " ").replace("{price}", " ").toLowerCase(Locale.ROOT);
        if (quantity >= 1 && quantity < WORDS_EN.length) stripped = stripped.replaceAll("\\b" + WORDS_EN[quantity] + "\\b(?=\\s+pairs?\\b)", " ");
        // The customer's own quantity in digits ("30 pairs", "30 \u043f\u0430\u0440", "30 \u0436\u0443\u043f") is only repeating the question too.
        if (quantity >= 1) stripped = Pattern.compile("(?<![\\d.,])" + quantity + "(?=\\s+(pairs?\\b|\u043f\u0430\u0440|\u0436\u0443\u043f))", Pattern.UNICODE_CASE).matcher(stripped).replaceAll(" ");
        if (quantity >= 2 && quantity < WORDS_RU.length) {
            stripped = Pattern.compile("(?<!\\p{L})(" + WORDS_RU[quantity] + ")(?=\\s+\u043f\u0430\u0440)", Pattern.UNICODE_CASE).matcher(stripped).replaceAll(" ");
            stripped = Pattern.compile("(?<!\\p{L})(" + WORDS_KY[quantity] + ")(?=\\s+\u0436\u0443\u043f)", Pattern.UNICODE_CASE).matcher(stripped).replaceAll(" ");
        }
        if (NUMBERISH_EN.matcher(stripped).find() || stripped.contains("{") || stripped.contains("}")) return false;
        if ((lang.equals(Replies.RU) || lang.equals(Replies.KY)) && NUMBERISH_RU.matcher(stripped).find()) return false;
        return !(lang.equals(Replies.KY) && NUMBERISH_KY.matcher(stripped).find());
    }
