package com.akven.thesis.negotiation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Talks the chat-completions format that Gemini, Ollama, Groq, OpenRouter and OpenAI all accept, so changing the
 * provider is a configuration change (base URL, key, model), not a code change. The key is only ever sent in the
 * Authorization header and is never logged.
 */
public class OpenAiCompatibleChatClient implements ChatClient {

    private final HttpClient http;
    private final ObjectMapper mapper = new ObjectMapper();
    private final URI endpoint;
    private final String apiKey;
    private final String model;
    private final Duration timeout;

    public OpenAiCompatibleChatClient(String baseUrl, String apiKey, String model, Duration timeout) {
        this.endpoint = URI.create(baseUrl.replaceAll("/+$", "") + "/chat/completions");
        this.apiKey = apiKey;
        this.model = model;
        this.timeout = timeout;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    @Override
    public String complete(String system, String user) throws IOException, InterruptedException {
        String body = mapper.writeValueAsString(Map.of(
                "model", model,
                "temperature", 0.4,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(Map.of("role", "system", "content", system), Map.of("role", "user", "content", user))));
        HttpRequest.Builder request = HttpRequest.newBuilder(endpoint).timeout(timeout)
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body));
        if (apiKey != null && !apiKey.isBlank()) request.header("Authorization", "Bearer " + apiKey);
        HttpResponse<String> response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IOException("The language model answered with HTTP " + response.statusCode());   // never include the body or the key
        }
        JsonNode content = mapper.readTree(response.body()).path("choices").path(0).path("message").path("content");
        if (!content.isTextual()) throw new IOException("The language model returned no text.");
        return content.asText();
    }
}
