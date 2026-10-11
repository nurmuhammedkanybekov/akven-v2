package com.akven.thesis.settings;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** Reads and writes the small runtime settings. Callers check permissions and write the audit record. */
@Service
public class Settings {

    public static final String ASSISTANT_MODE = "assistant.mode";
    public static final String CONTACTS_IMPORTED = "contacts.imported";

    private final AppSettingRepository repository;

    public Settings(AppSettingRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Optional<String> get(String key) {
        return repository.findById(key).map(AppSetting::getValue);
    }

    @Transactional
    public void put(String key, String value) {
        repository.findById(key).ifPresentOrElse(s -> s.set(value), () -> repository.save(new AppSetting(key, value)));
    }
}
