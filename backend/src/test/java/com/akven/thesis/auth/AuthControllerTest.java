package com.akven.thesis.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the real auth flow end to end against the in-memory H2 profile
 * (see src/test/resources/application.yml): register, login, a protected
 * route rejecting an anonymous request and accepting an authenticated one.
 * This is the actual verification for JwtAuthenticationFilter and
 * UserDetailsServiceImpl — the closest thing to "actually ran it" available
 * without a live Postgres instance.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registerThenLoginIssuesAWorkingToken() throws Exception {
        String registerBody = objectMapper.writeValueAsString(
                new AuthController.RegisterRequest("newcustomer@example.com", "correct-horse-battery"));

        mockMvc.perform(post("/api/auth/register").contentType("application/json").content(registerBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.token").isNotEmpty());

        String loginBody = objectMapper.writeValueAsString(
                new AuthController.LoginRequest("newcustomer@example.com", "correct-horse-battery"));

        String loginResponse = mockMvc.perform(post("/api/auth/login").contentType("application/json").content(loginBody))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String token = objectMapper.readTree(loginResponse).get("token").asText();

        // No token — the endpoint is protected, SecurityConfig's anyRequest().authenticated() applies.
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());

        // Valid token — JwtAuthenticationFilter should populate the SecurityContext from it.
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("newcustomer@example.com"))
                .andExpect(jsonPath("$.role").value("CUSTOMER"));
    }

    @Test
    void loginWithWrongPasswordIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content(objectMapper.writeValueAsString(
                                new AuthController.RegisterRequest("second@example.com", "correct-horse-battery"))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(objectMapper.writeValueAsString(
                                new AuthController.LoginRequest("second@example.com", "totally-wrong"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registeringTheSameEmailTwiceConflicts() throws Exception {
        String body = objectMapper.writeValueAsString(
                new AuthController.RegisterRequest("dup@example.com", "correct-horse-battery"));

        mockMvc.perform(post("/api/auth/register").contentType("application/json").content(body))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/auth/register").contentType("application/json").content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void repeatedWrongPasswordsLockTheAccountForThatClientWith429() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content(objectMapper.writeValueAsString(
                                new AuthController.RegisterRequest("locked@example.com", "correct-horse-battery"))))
                .andExpect(status().isCreated());
        String wrong = objectMapper.writeValueAsString(new AuthController.LoginRequest("locked@example.com", "nope-nope-nope"));

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login").contentType("application/json").content(wrong))
                    .andExpect(status().isUnauthorized());
        }
        // Sixth attempt: refused before the password is even checked, even with the RIGHT password.
        mockMvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(objectMapper.writeValueAsString(
                                new AuthController.LoginRequest("locked@example.com", "correct-horse-battery"))))
                .andExpect(status().isTooManyRequests())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .header().exists("Retry-After"));
    }
}
