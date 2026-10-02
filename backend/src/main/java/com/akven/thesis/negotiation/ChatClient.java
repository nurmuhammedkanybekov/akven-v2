package com.akven.thesis.negotiation;

/** One request to a language model: a system instruction and a user message in, the model's text out. */
public interface ChatClient {
    String complete(String system, String user) throws Exception;
}
