package com.akven.thesis.config;

import com.akven.thesis.user.Role;
import com.akven.thesis.user.User;
import com.akven.thesis.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * MockMvc never performs the servlet container's internal /error re-dispatch, so it cannot see
 * bugs that only appear on a real server. This test starts an actual embedded Tomcat and checks
 * the 401-versus-403 distinction end to end. Regression test for: "a STAFF user calling an
 * ADMIN-only endpoint got 401 instead of 403" (found while running against real Postgres).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RealServerSecurityTest {

    @LocalServerPort private int port;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void wrongRoleIs403AndNoTokenIs401OnARealServer() throws Exception {
        User staff = userRepository.findByEmail("real-staff@akven.test")
                .orElseGet(() -> userRepository.save(
                        new User("real-staff@akven.test", passwordEncoder.encode("irrelevant-123"), Role.STAFF)));
        String staffToken = jwtService.generateToken(staff);
        String adminOnly = "/api/admin/products/" + java.util.UUID.randomUUID() + "/audit";

        assertThat(status("GET", adminOnly, staffToken)).isEqualTo(403);   // valid token, wrong role
        assertThat(status("GET", adminOnly, null)).isEqualTo(401);         // no token at all
        assertThat(status("GET", "/api/products", null)).isEqualTo(200);   // public stays public
    }

    private int status(String method, String path, String token) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .method(method, HttpRequest.BodyPublishers.noBody());
        if (token != null) request.header("Authorization", "Bearer " + token);
        return http.send(request.build(), HttpResponse.BodyHandlers.discarding()).statusCode();
    }
}
