package com.akven.thesis.support;

import com.akven.thesis.config.JwtService;
import com.akven.thesis.user.Role;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** Shared plumbing for full-flow tests: real Spring context, real security filter chain, H2 database. */
@SpringBootTest
@AutoConfigureMockMvc
public abstract class IntegrationTest {

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    /** A real token for a real (persisted) user of the given role, created on first use. */
    protected String tokenFor(Role role) {
        String email = role.name().toLowerCase() + "-it@akven.test";
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> userRepository.save(new User(email, passwordEncoder.encode("test-password-123"), role)));
        return "Bearer " + jwtService.generateToken(user);
    }

    /** A real token for a real customer with a given email (several customers are needed to test ownership and races). */
    protected String tokenForEmail(String email, Role role) {
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> userRepository.save(new User(email, passwordEncoder.encode("test-password-123"), role)));
        return "Bearer " + jwtService.generateToken(user);
    }

    protected ResultActions getJson(String url, String token) throws Exception {
        var request = get(url);
        if (token != null) request.header("Authorization", token);
        return mockMvc.perform(request);
    }

    protected ResultActions sendJson(String method, String url, String token, Object body) throws Exception {
        var request = request(org.springframework.http.HttpMethod.valueOf(method), url)
                .contentType("application/json").content(objectMapper.writeValueAsString(body));
        if (token != null) request.header("Authorization", token);
        return mockMvc.perform(request);
    }

    protected JsonNode json(ResultActions result) throws Exception {
        // JSON is UTF-8 by definition; MockMvc would otherwise decode the body as Latin-1 and mangle characters such as the ellipsis.
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
    }
}
