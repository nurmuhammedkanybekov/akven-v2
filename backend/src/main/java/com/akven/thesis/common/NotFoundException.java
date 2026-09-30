package com.akven.thesis.common;

/** The requested resource does not exist (or is not visible to the caller). Mapped to 404. */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
