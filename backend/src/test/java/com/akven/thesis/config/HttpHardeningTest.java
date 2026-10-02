package com.akven.thesis.config;

import com.akven.thesis.support.IntegrationTest;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Response headers, CORS and request ids: the browser-facing hardening the React app will rely on. */
class HttpHardeningTest extends IntegrationTest {

    @Test
    void apiResponsesCarrySecurityHeaders() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))
                .andExpect(header().string("Permissions-Policy", "camera=(), microphone=(), geolocation=()"));
    }

    @Test
    void contentSecurityPolicyDoesNotBreakTheSwaggerPage() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
                .andExpect(header().doesNotExist("Content-Security-Policy"));
    }

    @Test
    void corsAllowsTheConfiguredFrontendOriginOnly() throws Exception {
        mockMvc.perform(options("/api/products").header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));

        mockMvc.perform(options("/api/products").header("Origin", "https://evil.example.com")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }

    @Test
    void everyResponseHasARequestIdAndUnsafeIncomingOnesAreReplaced() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(header().exists("X-Request-Id"));
        mockMvc.perform(get("/api/products").header("X-Request-Id", "abc\r\nInjected: yes"))
                .andExpect(header().string("X-Request-Id", org.hamcrest.Matchers.matchesPattern("[0-9a-f-]{36}")));
    }
}
