package com.akven.thesis.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/** Turns on @CreatedDate/@LastModifiedDate handling for AuditableEntity and the entities that use it directly. */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
