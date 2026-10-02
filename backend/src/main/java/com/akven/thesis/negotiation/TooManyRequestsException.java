package com.akven.thesis.negotiation;

/** The caller is sending messages faster than the limit allows. Mapped to 429. */
public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
