package com.akven.thesis.common;

import java.util.Map;

/** A well-formed request that breaks a domain rule (e.g. price below cost). Mapped to 400. */
public class BusinessRuleException extends CodedException {
    public BusinessRuleException(String message) {
        super(message);
    }

    /** With a stable code the shop translates (see CodedException); the message stays the English sentence. */
    public BusinessRuleException(String code, Map<String, Object> args, String message) {
        super(code, args, message);
    }
}
