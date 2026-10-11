package com.akven.thesis.negotiation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Builds the assistants. The deterministic rule-based one always exists: no network, no key, what CI and the tests
 * use. The language model talks to any OpenAI-compatible endpoint (Gemini by default; Ollama needs only
 * LLM_BASE_URL=http://localhost:11434/v1 and a model name) and is used when the AssistantSwitch says ai
 * (NEGOTIATION_PROVIDER=llm, or the super admin's choice in the admin), falling back to the rules on any failure.
 */
@Configuration
public class NegotiatorConfig {

    private static final Logger log = LoggerFactory.getLogger(NegotiatorConfig.class);

    @Bean
    AiAssistant aiAssistant(@Value("${akven.llm.base-url:https://generativelanguage.googleapis.com/v1beta/openai}") String baseUrl,
                            @Value("${akven.llm.api-key:}") String apiKey,
                            @Value("${akven.llm.model:gemini-3.5-flash-lite}") String model,
                            @Value("${akven.llm.timeout-seconds:12}") long timeoutSeconds) {
        AiAssistant ai = AiAssistant.from(baseUrl, apiKey, model, Duration.ofSeconds(timeoutSeconds));
        log.info("Language model '{}' at {}: {}", model, ai.endpointHost(), ai.configured() ? "configured" : "not configured (no key)");
        return ai;
    }

    @Bean
    Negotiator negotiator(AiAssistant ai, AssistantSwitch assistantSwitch) {
        return new SwitchingNegotiator(new RuleBasedNegotiator(), ai, assistantSwitch);
    }
}
