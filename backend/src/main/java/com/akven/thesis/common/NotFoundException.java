package com.akven.thesis.common;

import java.util.Map;

/** The requested resource does not exist (or is not visible to the caller). Mapped to 404. */
public class NotFoundException extends CodedException {
    public NotFoundException(String message) {
        super(message);
    }

    /** With a stable code the shop translates (see CodedException); the message stays the English sentence. */
    public NotFoundException(String code, Map<String, Object> args, String message) {
        super(code, args, message);
    }
}
