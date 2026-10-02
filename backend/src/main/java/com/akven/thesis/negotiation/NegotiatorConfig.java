package com.akven.thesis.negotiation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Chooses the assistant. NEGOTIATION_PROVIDER=rule (default) uses the deterministic stand-in: no network, no key,
 * what CI and the tests use. NEGOTIATION_PROVIDER=llm talks to any OpenAI-compatible endpoint (Gemini by default;
 * Ollama needs only LLM_BASE_URL=http://localhost:11434/v1 and a model name) and falls back to the rules on any failure.
 */
@Configuration
public class NegotiatorConfig {

    private static final Logger log = LoggerFactory.getLogger(NegotiatorConfig.class);

    @Bean
    Negotiator negotiator(@Value("${akven.negotiation.provider:rule}") String provider,
                          @Value("${akven.llm.base-url:https://generativelanguage.googleapis.com/v1beta/openai}") String baseUrl,
                          @Value("${akven.llm.api-key:}") String apiKey,
                          @Value("${akven.llm.model:gemini-3.5-flash-lite}") String model,
                          @Value("${akven.llm.timeout-seconds:12}") long timeoutSeconds) {
        RuleBasedNegotiator rules = new RuleBasedNegotiator();
        if (!"llm".equalsIgnoreCase(provider)) {
            log.info("Negotiation assistant: rule-based");
            return rules;
        }
        log.info("Negotiation assistant: language model '{}' at {} (key {}), rule-based fallback on failure", model, baseUrl, apiKey.isBlank() ? "not set" : "set");
        return new FallbackNegotiator(new LlmNegotiator(new OpenAiCompatibleChatClient(baseUrl, apiKey, model, Duration.ofSeconds(timeoutSeconds))), rules);
    }
}
