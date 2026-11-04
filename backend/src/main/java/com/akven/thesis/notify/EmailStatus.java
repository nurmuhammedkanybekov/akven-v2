package com.akven.thesis.notify;

/** Where an email is: waiting for the sender, delivered to the mail server, given up on, or kept because no server is set up. */
public enum EmailStatus {
    QUEUED,
    SENT,
    /** The mail server refused it several times; an owner can try again from the admin. */
    FAILED,
    /** No mail server is configured (demo mode, a laptop): nothing left the shop; the email can be read in the admin. */
    NOT_SENT
}
