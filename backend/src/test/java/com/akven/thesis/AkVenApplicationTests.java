package com.akven.thesis;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Smoke test: the application context loads. Deliberately the only test in
 * the skeleton — real coverage (including the >80% model-layer bar for
 * Milestone 3) starts once PolicyValidator and the negotiation pipeline
 * exist in Phase 2.
 */
@SpringBootTest
class AkVenApplicationTests {

    @Test
    void contextLoads() {
    }
}
