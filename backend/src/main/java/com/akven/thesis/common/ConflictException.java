package com.akven.thesis.common;

import java.util.Map;

/** The request collides with existing state (duplicate slug/SKU, stale version). Mapped to 409. */
public class ConflictException extends CodedException {
    public ConflictException(String message) {
        super(message);
    }

    /** With a stable code the shop translates (see CodedException); the message stays the English sentence. */
    public ConflictException(String code, Map<String, Object> args, String message) {
        super(code, args, message);
    }
}
