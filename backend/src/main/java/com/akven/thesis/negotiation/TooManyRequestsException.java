package com.akven.thesis.negotiation;

import com.akven.thesis.common.CodedException;

import java.util.Map;

/** The caller is sending messages faster than the limit allows. Mapped to 429. */
public class TooManyRequestsException extends CodedException {
    public TooManyRequestsException(String message) {
        super(message);
    }

    /** With a stable code the shop translates (see CodedException); the message stays the English sentence. */
    public TooManyRequestsException(String code, Map<String, Object> args, String message) {
        super(code, args, message);
    }
}
