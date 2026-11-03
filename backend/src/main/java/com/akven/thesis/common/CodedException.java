package com.akven.thesis.common;

import java.util.Map;

/**
 * An error a customer can see, with a stable code (for example "ITEM_LOW_STOCK") and the values in its sentence, so
 * the shop can say it in the customer's language. The message stays the English sentence it always was: the code
 * is an addition to the error response, not a change to it.
 */
public abstract class CodedException extends RuntimeException {

    private final String code;
    private final Map<String, Object> args;

    protected CodedException(String message) {
        this(null, Map.of(), message);
    }

    protected CodedException(String code, Map<String, Object> args, String message) {
        super(message);
        this.code = code;
        this.args = args == null ? Map.of() : Map.copyOf(args);
    }

    /** Null for errors only the shop team sees: their English message is shown as it is. */
    public String code() { return code; }

    public Map<String, Object> args() { return args; }
}
