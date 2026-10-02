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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * What H2 cannot prove, run against a real PostgreSQL 16 + pgvector database on a real server:
 * Flyway (all migrations), Hibernate schema validation (the context would not even start on drift), that the
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

        String variantId = call("GET", "/api/admin/products?q=Merino%20Dress&pageSize=1", staff, null)
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
        assertThat(count(facets.get("section"), "thermal")).isGreaterThanOrEqualTo(2);

        JsonNode byPrice = call("GET", "/api/products?sort=price_asc&pageSize=3", null, null);
        assertThat(byPrice.get("items").get(0).get("minPrice").decimalValue())
                .isLessThanOrEqualTo(byPrice.get("items").get(1).get("minPrice").decimalValue());

        String detail = http.send(HttpRequest.newBuilder(uri("/api/products/sport-cushion-crew")).build(),
                HttpResponse.BodyHandlers.ofString()).body();
        assertThat(detail).contains("/media/products/sport-cushion-crew-1.svg")
                .doesNotContain("costPrice", "marginFloorPct");
    }

    @Test
    void migrationV7CarriedTheOldFixedValuesOverIntoTheOwnersSectionsAndCuts() throws Exception {
        JsonNode terms = call("GET", "/api/catalog/terms", null, null);
        assertThat(names(terms.get("sections"))).contains("Classic", "Casual", "Sport", "Thermal");
        assertThat(names(terms.get("cuts"))).containsSubsequence("No-show", "Ankle", "Crew", "Mid-long", "Knee-high");

        // V3 stored DRESS / CREW for this product; V7 must have mapped that to Classic / Crew.
        JsonNode dress = call("GET", "/api/products/merino-dress-black", null, null);
        assertThat(dress.get("section").get("name").asText()).isEqualTo("Classic");
        assertThat(dress.get("cut").get("name").asText()).isEqualTo("Crew");
        assertThat(dress.get("quality").asText()).isEqualTo("Premium merino");
        assertThat(dress.get("origin").asText()).isEqualTo("Korea");
        assertThat(dress.get("variants").get(0).get("colorHex").asText()).matches("#[0-9A-F]{6}");

        JsonNode bundle = call("GET", "/api/products/bazaar-family-pack", null, null);
        assertThat(bundle.get("section").isNull()).isTrue();
        assertThat(bundle.get("cut").isNull()).isTrue();
    }

    @Test
    void anOwnerCanBuildASectionAndAProductAndUploadAPhotoOnARealServer() throws Exception {
        String staff = login("staff@akven.test", "changeme-staff");
        String sectionId = call("POST", "/api/admin/terms", staff,
                "{\"kind\":\"SECTION\",\"name\":\"Premium Gold Line\",\"description\":\"Our finest\"}", 201).get("id").asText();
        String productId = call("POST", "/api/admin/products", staff,
                "{\"name\":\"Ak&Ven Mid-Long Socks\",\"category\":\"WOMEN\",\"sectionId\":\"" + sectionId
                        + "\",\"quality\":\"Premium\",\"origin\":\"Korea\"}", 201).get("id").asText();

        // A real multipart upload through a real servlet container.
        byte[] png = java.util.Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        String boundary = "----akven" + System.nanoTime();
        HttpResponse<String> uploaded = http.send(multipart("/api/admin/products/" + productId + "/images/upload", staff,
                boundary, "front.png", "image/png", png), HttpResponse.BodyHandlers.ofString());
        assertThat(uploaded.statusCode()).as(uploaded.body()).isEqualTo(200);
        String url = objectMapper.readTree(uploaded.body()).get("images").get(0).get("url").asText();

        HttpResponse<byte[]> served = http.send(HttpRequest.newBuilder(uri(url)).build(), HttpResponse.BodyHandlers.ofByteArray());
        assertThat(served.statusCode()).isEqualTo(200);
        assertThat(served.headers().firstValue("Content-Type")).hasValue("image/png");
        assertThat(served.body()).isEqualTo(png);

        HttpResponse<String> rejected = http.send(multipart("/api/admin/products/" + productId + "/images/upload", staff,
                boundary, "x.png", "image/png", "<script>alert(1)</script>".getBytes()), HttpResponse.BodyHandlers.ofString());
        assertThat(rejected.statusCode()).isEqualTo(400);

        // The product is not in the shop until it has a variant, but it is findable in the admin list.
        assertThat(call("GET", "/api/admin/products?q=Mid-Long&pageSize=50", staff, null).get("items").toString())
                .contains("ak-ven-mid-long-socks");
    }

    @Test
    void orderConstraintsHoldInTheDatabaseItself() {
        String customer = jdbc.queryForObject("select id::text from app_user where email = 'staff@akven.test'", String.class);
        // FR-8: an order cannot be PAID without a payment reference.
        assertThatThrownBy(() -> jdbc.update("insert into customer_order (customer_id, status) values (?::uuid, 'PAID')", customer))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("customer_order_paid_has_ref_chk");
        // Delivery needs an address.
        assertThatThrownBy(() -> jdbc.update("insert into customer_order (customer_id, fulfillment_method) values (?::uuid, 'DELIVERY')", customer))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("customer_order_delivery_address_chk");
        // The same customer cannot create two orders with one idempotency key.
        jdbc.update("insert into customer_order (customer_id, idempotency_key) values (?::uuid, 'db-idem-key-0000000001')", customer);
        assertThatThrownBy(() -> jdbc.update("insert into customer_order (customer_id, idempotency_key) values (?::uuid, 'db-idem-key-0000000001')", customer))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("customer_order_idempotency_uq");
        // A negotiated offer can be used by one order line only.
        jdbc.update("""
                insert into negotiation_session (id, customer_id, variant_id, transcript, proposed_discount_pct, validated_discount_pct)
                select '00000000-0000-0000-0000-00000000a001', ?::uuid, id, 't', 10, 10 from variant limit 1""", customer);
        String order = jdbc.queryForObject("select id::text from customer_order where idempotency_key = 'db-idem-key-0000000001'", String.class);
        String item = "insert into order_item (order_id, variant_id, quantity, agreed_price, negotiation_session_id) "
                + "select ?::uuid, id, 1, 5, '00000000-0000-0000-0000-00000000a001' from variant order by sku limit 1 offset ?";
        jdbc.update(item, order, 0);
        assertThatThrownBy(() -> jdbc.update(item, order, 1))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("order_item_negotiation_once_uq");
    }

    @Test
    void sixShoppersRaceForTheLastPairOverRealHttpAndExactlyOneWins() throws Exception {
        String admin = login("admin@akven.test", "changeme-admin");
        String tag = Long.toString(System.nanoTime(), 36);
        String productId = call("POST", "/api/admin/products", admin, "{\"name\":\"Race Sock " + tag + "\",\"category\":\"MEN\"}", 201).get("id").asText();
        String sku = "RACE-" + tag.toUpperCase();
        call("POST", "/api/admin/products/" + productId + "/variants", admin,
                "{\"sku\":\"" + sku + "\",\"size\":\"M\",\"color\":\"Navy\",\"price\":10,\"costPrice\":4,\"marginFloorPct\":15,\"stockQty\":1}", 201);

        int shoppers = 6;
        List<String> tokens = new java.util.ArrayList<>();
        for (int i = 0; i < shoppers; i++) {
            tokens.add(call("POST", "/api/auth/register", null, "{\"email\":\"racer" + i + "-" + tag + "@akven.test\",\"password\":\"correct-horse-battery\"}", 201).get("token").asText());
        }
        String checkout = "{\"items\":[{\"sku\":\"" + sku + "\",\"quantity\":1}],"
                + "\"fulfillment\":{\"method\":\"PICKUP\",\"contactName\":\"Racer\",\"contactPhone\":\"+996700000000\"},"
                + "\"payment\":{\"method\":\"GOOGLE_PAY\",\"token\":\"sim_google_abcdef123456\"}}";
        List<java.util.concurrent.CompletableFuture<HttpResponse<String>>> inFlight = new java.util.ArrayList<>();
        java.util.concurrent.CountDownLatch go = new java.util.concurrent.CountDownLatch(1);
        for (String token : tokens) {
            HttpRequest r = HttpRequest.newBuilder(uri("/api/orders")).header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json").header("Idempotency-Key", java.util.UUID.randomUUID().toString())
                    .POST(HttpRequest.BodyPublishers.ofString(checkout)).build();
            inFlight.add(java.util.concurrent.CompletableFuture.supplyAsync(() -> {
                try { go.await(); return http.send(r, HttpResponse.BodyHandlers.ofString()); } catch (Exception e) { throw new RuntimeException(e); }
            }));
        }
        go.countDown();
        int created = 0, refused = 0;
        for (var f : inFlight) {
            int code = f.get().statusCode();
            if (code == 201) created++; else if (code == 409) refused++; else throw new AssertionError("unexpected status " + code + ": " + f.get().body());
        }
        assertThat(created).as("orders created").isEqualTo(1);
        assertThat(refused).as("refused for stock").isEqualTo(shoppers - 1);

        JsonNode variant = call("GET", "/api/admin/products/" + productId, admin, null).get("variants").get(0);
        assertThat(variant.get("stockQty").asInt()).isZero();
        assertThat(variant.get("reservedQty").asInt()).isZero();
    }

    @Test
    void fourIdenticalRequestsWithOneIdempotencyKeyCreateOneOrder() throws Exception {
        String admin = login("admin@akven.test", "changeme-admin");
        String tag = Long.toString(System.nanoTime(), 36);
        String productId = call("POST", "/api/admin/products", admin, "{\"name\":\"Idem Sock " + tag + "\",\"category\":\"MEN\"}", 201).get("id").asText();
        String sku = "IDEM-" + tag.toUpperCase();
        call("POST", "/api/admin/products/" + productId + "/variants", admin,
                "{\"sku\":\"" + sku + "\",\"price\":10,\"costPrice\":4,\"marginFloorPct\":15,\"stockQty\":10}", 201);
        String token = call("POST", "/api/auth/register", null, "{\"email\":\"idem-" + tag + "@akven.test\",\"password\":\"correct-horse-battery\"}", 201).get("token").asText();
        String key = java.util.UUID.randomUUID().toString();
        String checkout = "{\"items\":[{\"sku\":\"" + sku + "\",\"quantity\":1}],"
                + "\"fulfillment\":{\"method\":\"PICKUP\",\"contactName\":\"Doubleclick\",\"contactPhone\":\"+996700000000\"},"
                + "\"payment\":{\"method\":\"APPLE_PAY\",\"token\":\"sim_apple_abcdef123456\"}}";
        java.util.concurrent.CountDownLatch go = new java.util.concurrent.CountDownLatch(1);
        List<java.util.concurrent.CompletableFuture<HttpResponse<String>>> inFlight = new java.util.ArrayList<>();
        for (int i = 0; i < 4; i++) {
            HttpRequest r = HttpRequest.newBuilder(uri("/api/orders")).header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json").header("Idempotency-Key", key).POST(HttpRequest.BodyPublishers.ofString(checkout)).build();
            inFlight.add(java.util.concurrent.CompletableFuture.supplyAsync(() -> {
                try { go.await(); return http.send(r, HttpResponse.BodyHandlers.ofString()); } catch (Exception e) { throw new RuntimeException(e); }
            }));
        }
        go.countDown();
        int created = 0;
        for (var f : inFlight) {
            int code = f.get().statusCode();
            assertThat(code).as(f.get().body()).isIn(200, 201, 409);        // the same order again, or "still being processed"
            if (code == 201) created++;
        }
        assertThat(created).isEqualTo(1);
        assertThat(call("GET", "/api/orders", token, null)).hasSize(1);       // one order, one sale
        assertThat(call("GET", "/api/admin/products/" + productId, admin, null).get("variants").get(0).get("stockQty").asInt()).isEqualTo(9);
    }

    @Test
    void databaseConstraintsRejectBadDataEvenIfTheApplicationWouldAllowIt() {
        // A bundle may not carry a section or a cut.
        assertThatThrownBy(() -> jdbc.update("""
                insert into product (slug, name, category, cut_id)
                select 'x-bundle', 'x', 'BUNDLES', id from catalog_term where kind = 'CUT' limit 1"""))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("product_bundle_no_terms_chk");
        // Unknown category.
        assertThatThrownBy(() -> jdbc.update("insert into product (slug, name, category) values ('x-shoe','x','SHOES')"))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("product_category_chk");
        // Term kinds are a closed list, and a slug is unique within its kind.
        assertThatThrownBy(() -> jdbc.update("insert into catalog_term (kind, slug, name) values ('COLOUR','x','x')"))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("insert into catalog_term (kind, slug, name) values ('SECTION','classic','dup')"))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("catalog_term_kind_slug_uq");
        // A colour swatch must be #RRGGBB.
        assertThatThrownBy(() -> jdbc.update("update variant set color_hex = 'red' where sku = 'WCC-BLK-M-1'"))
                .isInstanceOf(DataIntegrityViolationException.class);
        // Stock may never drop below reserved (oversell guard).
        assertThatThrownBy(() -> jdbc.update("update variant set reserved_qty = stock_qty + 1 where sku = 'WCC-BLK-M-1'"))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("variant_stock_ge_reserved_chk");
        // The negotiation guardrail's second layer: validated can never exceed proposed.
        assertThatThrownBy(() -> jdbc.update("""
                insert into negotiation_session (customer_id, variant_id, transcript, proposed_discount_pct, validated_discount_pct)
                select u.id, v.id, 't', 10, 30 from app_user u, variant v limit 1"""))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("negotiation_validated_le_proposed_chk");
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

    private HttpRequest multipart(String path, String token, String boundary, String filename, String type, byte[] content) {
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n"
                + "Content-Type: " + type + "\r\n\r\n";
        out.writeBytes(head.getBytes());
        out.writeBytes(content);
        out.writeBytes(("\r\n--" + boundary + "--\r\n").getBytes());
        return HttpRequest.newBuilder(uri(path)).header("Authorization", "Bearer " + token)
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(out.toByteArray())).build();
    }

    private static int count(JsonNode options, String slug) {
        for (JsonNode o : options) if (o.get("slug").asText().equals(slug)) return o.get("count").asInt();
        throw new AssertionError("no facet option " + slug);
    }

    private static java.util.List<String> names(JsonNode terms) {
        java.util.List<String> out = new java.util.ArrayList<>();
        terms.forEach(t -> out.add(t.get("name").asText()));
        return out;
    }

    private int status(String method, String path, String token, String body) throws Exception {
        return http.send(request(method, path, token, body), HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    private JsonNode call(String method, String path, String token, String body) throws Exception {
        return call(method, path, token, body, 200);
    }

    private JsonNode call(String method, String path, String token, String body, int expectedStatus) throws Exception {
        HttpResponse<String> r = http.send(request(method, path, token, body), HttpResponse.BodyHandlers.ofString());
        assertThat(r.statusCode()).as(method + " " + path + " -> " + r.body()).isEqualTo(expectedStatus);
        return objectMapper.readTree(r.body());
    }

    private String login(String email, String password) throws Exception {
        return call("POST", "/api/auth/login", null,
                "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}").get("token").asText();
    }
}
