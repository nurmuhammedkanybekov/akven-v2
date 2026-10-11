package com.akven.thesis.negotiation;

import com.akven.thesis.settings.Settings;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Which assistant answers the chat: "ai" or "rules". The super admin switches it in the admin without a restart; until
 * then the environment's NEGOTIATION_PROVIDER decides (llm means ai). Asking for ai without a configured model still
 * answers with the rules, so the chat never breaks.
 */
@Component
public class AssistantSwitch {

    public static final String AI = "ai", RULES = "rules";

    private final Settings settings;
    private final String fromEnvironment;

    public AssistantSwitch(Settings settings, @Value("${akven.negotiation.provider:rule}") String provider) {
        this.settings = settings;
        this.fromEnvironment = "llm".equalsIgnoreCase(provider) || AI.equalsIgnoreCase(provider) ? AI : RULES;
    }

    /** The chosen mode: the super admin's choice if there is one, otherwise the environment's. */
    public String mode() {
        return settings.get(Settings.ASSISTANT_MODE).map(m -> m.toLowerCase(Locale.ROOT)).filter(m -> m.equals(AI) || m.equals(RULES)).orElse(fromEnvironment);
    }

    public void set(String mode) {
        settings.put(Settings.ASSISTANT_MODE, mode);
    }
}
