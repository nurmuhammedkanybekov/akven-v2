package com.akven.thesis.common;

/** The request collides with existing state (duplicate slug/SKU, stale version). Mapped to 409. */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
