package com.akven.thesis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * What H2 cannot prove, run against a real PostgreSQL 16 + pgvector database on a real server:
 * Flyway V1-V6, Hibernate schema validation (the context would not even start on drift), that the
 * seeded pgcrypto bcrypt hashes are accepted by Spring, jsonb audit rows, and the database-level
 * CHECK constraints that back the thesis's guardrail claims.
 *
 * Skipped unless AKVEN_PG_URL is set (CI sets it; locally see README). Point it at an EMPTY
 * database so Flyway can build the schema, e.g. jdbc:postgresql://localhost:5432/akven_it.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("pg")
@EnabledIfEnvironmentVariable(named = "AKVEN_PG_URL", matches = ".+")
class PostgresIntegrationTest {

    @LocalServerPort private int port;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JdbcTemplate jdbc;

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void seededAccountsWorkAndRolesAreEnforcedOnARealServer() throws Exception {
        String admin = login("admin@akven.test", "changeme-admin");
        String staff = login("staff@akven.test", "changeme-staff");

        assertThat(call("GET", "/api/auth/me", admin, null).get("role").asText()).isEqualTo("ADMIN");
        assertThat(status("POST", "/api/auth/login", null,
                "{\"email\":\"admin@akven.test\",\"password\":\"wrong-password\"}")).isEqualTo(401);

        String variantId = call("GET", "/api/admin/products?pageSize=1", staff, null)
                .get("items").get(0).get("variants").get(0).get("id").asText();
        String policy = "{\"costPrice\":2.50,\"marginFloorPct\":18}";
        assertThat(status("PUT", "/api/admin/variants/" + variantId + "/pricing-policy", staff, policy)).isEqualTo(403);
        assertThat(status("PUT", "/api/admin/variants/" + variantId + "/pricing-policy", admin, policy)).isEqualTo(200);

        JsonNode audit = call("GET", "/api/admin/variants/" + variantId + "/audit", admin, null);
        assertThat(audit.get(0).get("action").asText()).isEqualTo("VARIANT_PRICING_POLICY_UPDATED");
        assertThat(jdbc.queryForObject("select jsonb_typeof(after_state) from audit_log_entry where id = ?::uuid",
                String.class, audit.get(0).get("id").asText())).isEqualTo("object");
    }

    @Test
    void seededCatalogIsBrowsableFilterableAndNeverLeaksCost() throws Exception {
        JsonNode men = call("GET", "/api/products?category=MEN&pageSize=48", null, null);
        assertThat(men.get("totalItems").asInt()).isGreaterThanOrEqualTo(5);

        JsonNode facets = call("GET", "/api/products/facets", null, null);
        assertThat(facets.get("category").get("BUNDLES").asInt()).isEqualTo(2);
        assertThat(facets.get("occasion").get("THERMAL").asInt()).isGreaterThanOrEqualTo(2);

        JsonNode byPrice = call("GET", "/api/products?sort=price_asc&pageSize=3", null, null);
        assertThat(byPrice.get("items").get(0).get("minPrice").decimalValue())
                .isLessThanOrEqualTo(byPrice.get("items").get(1).get("minPrice").decimalValue());

        String detail = http.send(HttpRequest.newBuilder(uri("/api/products/sport-cushion-crew")).build(),
                HttpResponse.BodyHandlers.ofString()).body();
        assertThat(detail).contains("/media/products/sport-cushion-crew-1.svg")
                .doesNotContain("costPrice", "marginFloorPct");
    }

    @Test
    void databaseConstraintsRejectBadDataEvenIfTheApplicationWouldAllowIt() {
        // A bundle may not carry cut/occasion.
        assertThatThrownBy(() -> jdbc.update("insert into product (slug, name, category, cut) values ('x-bundle','x','BUNDLES','CREW')"))
                .isInstanceOf(DataIntegrityViolationException.class);
        // Unknown category.
        assertThatThrownBy(() -> jdbc.update("insert into product (slug, name, category) values ('x-shoe','x','SHOES')"))
                .isInstanceOf(DataIntegrityViolationException.class);
        // Stock may never drop below reserved (oversell guard).
        assertThatThrownBy(() -> jdbc.update("update variant set reserved_qty = stock_qty + 1 where sku = 'WCC-BLK-M-1'"))
                .isInstanceOf(DataIntegrityViolationException.class);
        // The negotiation guardrail's second layer: validated can never exceed proposed.
        assertThatThrownBy(() -> jdbc.update("""
                insert into negotiation_session (customer_id, variant_id, transcript, proposed_discount_pct, validated_discount_pct)
                select u.id, v.id, 't', 10, 30 from app_user u, variant v limit 1"""))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // ---- tiny HTTP helpers -----------------------------------------------------------------

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private HttpRequest request(String method, String path, String token, String body) {
        HttpRequest.Builder b = HttpRequest.newBuilder(uri(path)).method(method,
                body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        if (body != null) b.header("Content-Type", "application/json");
        if (token != null) b.header("Authorization", "Bearer " + token);
        return b.build();
    }

    private int status(String method, String path, String token, String body) throws Exception {
        return http.send(request(method, path, token, body), HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    private JsonNode call(String method, String path, String token, String body) throws Exception {
        HttpResponse<String> r = http.send(request(method, path, token, body), HttpResponse.BodyHandlers.ofString());
        assertThat(r.statusCode()).as(method + " " + path + " -> " + r.body()).isEqualTo(200);
        return objectMapper.readTree(r.body());
    }

    private String login(String email, String password) throws Exception {
        return call("POST", "/api/auth/login", null,
                "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}").get("token").asText();
    }
}
