package com.akven.thesis.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/**
 * Which build is running: the Git commit it was built from (passed in by deploy/deploy.sh as AKVEN_COMMIT) and when
 * it started. It answers "is the server up to date?" without logging in to the server. It reveals nothing a visitor
 * could not already see on GitHub.
 */
@RestController
public class VersionController {

    public record BuildInfo(String commit, Instant startedAt) {}

    private final BuildInfo info;

    public VersionController(@Value("${akven.commit:unknown}") String commit) {
        this.info = new BuildInfo(commit == null || commit.isBlank() ? "unknown" : commit.trim(), Instant.now());
    }

    @GetMapping("/api/version")
    public BuildInfo version() {
        return info;
    }
}
