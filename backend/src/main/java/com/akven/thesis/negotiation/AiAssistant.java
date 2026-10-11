package com.akven.thesis.negotiation;

import java.net.URI;

/**
 * The language-model assistant as configured from the environment, or "not configured". Kept as its own bean so the
 * super admin's screen and the live evaluation can reach the model directly, whatever answers the chat right now.
 *
 * @param negotiator the model with no fallback, or null when there is no key (and no local model)
 * @param endpointHost only the host, never the key, so it can be shown on screen
 */
public record AiAssistant(Negotiator negotiator, String model, String endpointHost) {

    public boolean configured() {
        return negotiator != null;
    }

    static AiAssistant from(String baseUrl, String apiKey, String model, java.time.Duration timeout) {
        String host;
        try {
            host = URI.create(baseUrl).getHost();
        } catch (IllegalArgumentException e) {
            host = null;
        }
        // A local model (Ollama) needs no key; a hosted one does.
        boolean local = host != null && (host.equals("localhost") || host.equals("127.0.0.1") || host.equals("host.docker.internal"));
        boolean usable = local || (apiKey != null && !apiKey.isBlank());
        return new AiAssistant(usable ? new LlmNegotiator(new OpenAiCompatibleChatClient(baseUrl, apiKey, model, timeout)) : null, model, host);
    }
}
