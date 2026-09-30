package com.akven.thesis.common;

/** A well-formed request that breaks a domain rule (e.g. price below cost). Mapped to 400. */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
