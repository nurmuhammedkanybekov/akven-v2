package com.akven.thesis.catalog;

import com.akven.thesis.audit.AuditLogEntry;
import com.akven.thesis.audit.AuditLogRepository;
import com.akven.thesis.catalog.AdminCatalogDtos.*;
import com.akven.thesis.support.IntegrationTest;
import com.akven.thesis.user.Role;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Admin catalog API: who may do what (401 vs 403, FR-9/FR-11), that every mutation leaves an
 * audit entry (FR-13), soft delete (FR-10), and the business rules around price and stock.
 */
class AdminCatalogControllerTest extends IntegrationTest {

    @Autowired private AuditLogRepository auditLogRepository;

    @Test
    void anonymousIs401AndCustomerIs403() throws Exception {
        getJson("/api/admin/products", null).andExpect(status().isUnauthorized());
        getJson("/api/admin/products", tokenFor(Role.CUSTOMER)).andExpect(status().isForbidden());
        sendJson("POST", "/api/admin/products", tokenFor(Role.CUSTOMER), newProduct("c-nope"))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffCreatesAndEditsProductAndEveryStepIsAudited() throws Exception {
        String staff = tokenFor(Role.STAFF);
        JsonNode created = json(sendJson("POST", "/api/admin/products", staff, newProduct("admin-flow-product"))
                .andExpect(status().isCreated()));
        UUID id = UUID.fromString(created.get("id").asText());

        sendJson("PUT", "/api/admin/products/" + id, staff,
                new UpdateProductRequest("Renamed", Category.WOMEN, null, null, "AdminCol", "new", "cotton", "Premium", "Wash cold", "Korea"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed"))
                .andExpect(jsonPath("$.quality").value("Premium"))
                .andExpect(jsonPath("$.slug").value("admin-flow-product"));   // slug never changes

        List<AuditLogEntry> trail = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("PRODUCT", id);
        assertThat(trail).extracting(AuditLogEntry::getAction)
                .containsExactly("PRODUCT_UPDATED", "PRODUCT_CREATED");
        assertThat(trail.get(0).getBeforeState()).contains("Admin Flow Product");
        assertThat(trail.get(0).getAfterState()).contains("Renamed");
    }

    @Test
    void duplicateSlugIs409AndBundleWithCutIs400() throws Exception {
        String staff = tokenFor(Role.STAFF);
        sendJson("POST", "/api/admin/products", staff, newProduct("dup-slug-product")).andExpect(status().isCreated());
        sendJson("POST", "/api/admin/products", staff, newProduct("dup-slug-product")).andExpect(status().isConflict());

        sendJson("POST", "/api/admin/products", staff,
                new CreateProductRequest("bad-bundle", "Bad", Category.BUNDLES, null, createTerm(staff, TermKind.CUT, "Bundle Cut Test"),
                        null, null, null, null, null, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Bundles cannot have a section or a cut."));
    }

    @Test
    void validationErrorsListTheOffendingFields() throws Exception {
        sendJson("POST", "/api/admin/products", tokenFor(Role.STAFF),
                new CreateProductRequest("Bad Slug!", "", null, null, null, null, null, null, null, null, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.slug").exists())
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.category").exists());
    }

    @Test
    void onlyAdminMayCreateVariantsAndChangeMarginFloor() throws Exception {
        String staff = tokenFor(Role.STAFF);
        String admin = tokenFor(Role.ADMIN);
        UUID productId = createProduct(staff, "margin-rules-product");

        // STAFF cannot create a variant (it would set cost and floor)...
        sendJson("POST", "/api/admin/products/" + productId + "/variants", staff, newVariant("MR-STAFF"))
                .andExpect(status().isForbidden());
        // ...ADMIN can.
        JsonNode variant = json(sendJson("POST", "/api/admin/products/" + productId + "/variants", admin,
                newVariant("MR-ADMIN")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.marginFloorPct").value(15.00)));
        UUID variantId = UUID.fromString(variant.get("id").asText());

        // STAFF cannot touch cost or floor (FR-11), even on an existing variant.
        PricingPolicyRequest policy = new PricingPolicyRequest(new BigDecimal("3.00"), new BigDecimal("40.00"), null);
        sendJson("PUT", "/api/admin/variants/" + variantId + "/pricing-policy", staff, policy)
                .andExpect(status().isForbidden());
        assertThat(floorOf(variantId)).isEqualByComparingTo("15.00");

        // ADMIN can, and it is audited with before and after.
        sendJson("PUT", "/api/admin/variants/" + variantId + "/pricing-policy", admin, policy)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.marginFloorPct").value(40.00));
        assertThat(floorOf(variantId)).isEqualByComparingTo("40.00");
        List<AuditLogEntry> trail = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("VARIANT", variantId);
        assertThat(trail.get(0).getAction()).isEqualTo("VARIANT_PRICING_POLICY_UPDATED");
        assertThat(trail.get(0).getBeforeState()).contains("15.0");
        assertThat(trail.get(0).getAfterState()).contains("40.0");
    }

    @Test
    void staffCanEditPriceAndStockButItNeverChangesCostOrFloor() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID variantId = createVariant(staff, tokenFor(Role.ADMIN), "staff-edit-product", "SE-1");

        sendJson("PUT", "/api/admin/variants/" + variantId, staff,
                new UpdateVariantRequest("L", "Navy", "#1F2A44", 3, new BigDecimal("9.50"), 77, true, null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.price").value(9.50))
                .andExpect(jsonPath("$.stockQty").value(77))
                .andExpect(jsonPath("$.marginFloorPct").value(15.00))
                .andExpect(jsonPath("$.costPrice").value(4.00));
    }

    @Test
    void priceBelowCostIs400() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID variantId = createVariant(staff, tokenFor(Role.ADMIN), "below-cost-product", "BC-1");

        sendJson("PUT", "/api/admin/variants/" + variantId, staff,
                new UpdateVariantRequest("M", "Black", null, 1, new BigDecimal("3.99"), 10, true, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Price cannot be lower than the cost price."));
    }

    @Test
    void staleVersionIsRejectedWith409() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID variantId = createVariant(staff, tokenFor(Role.ADMIN), "stale-product", "ST-1");

        // First edit succeeds and bumps the version; replaying the old version must be refused.
        sendJson("PUT", "/api/admin/variants/" + variantId, staff,
                new UpdateVariantRequest("M", "Black", null, 1, new BigDecimal("8.00"), 10, true, 0)).andExpect(status().isOk());
        sendJson("PUT", "/api/admin/variants/" + variantId, staff,
                new UpdateVariantRequest("M", "Black", null, 1, new BigDecimal("9.00"), 10, true, 0)).andExpect(status().isConflict());
    }

    @Test
    void retiringHidesTheProductFromTheStorefrontButKeepsTheRow() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID id = createProduct(staff, "to-be-retired");
        getJson("/api/products/to-be-retired", null).andExpect(status().isOk());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .delete("/api/admin/products/" + id).header("Authorization", staff)).andExpect(status().isNoContent());

        getJson("/api/products/to-be-retired", null).andExpect(status().isNotFound());
        getJson("/api/admin/products/" + id, staff).andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false))
                .andExpect(jsonPath("$.retiredAt").exists());
        assertThat(auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("PRODUCT", id))
                .extracting(AuditLogEntry::getAction).contains("PRODUCT_RETIRED");
    }

    @Test
    void imagesCanBeReplacedAreOrderedAndAudited() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID id = createProduct(staff, "image-product");
        ReplaceImagesRequest body = new ReplaceImagesRequest(List.of(
                new ImageRequest("/media/products/image-product-1.svg", "Front"),
                new ImageRequest("https://cdn.example.com/side.jpg", "Side")));

        sendJson("PUT", "/api/admin/products/" + id + "/images", staff, body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.images[0].alt").value("Front"))
                .andExpect(jsonPath("$.images[1].url").value("https://cdn.example.com/side.jpg"));
        // Replacing again with the same positions must work (bulk delete happens before re-insert).
        sendJson("PUT", "/api/admin/products/" + id + "/images", staff,
                new ReplaceImagesRequest(List.of(new ImageRequest("/media/products/new.svg", "Only"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.images.length()").value(1));
        assertThat(auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("PRODUCT", id))
                .extracting(AuditLogEntry::getAction).contains("PRODUCT_IMAGES_REPLACED");
        sendJson("PUT", "/api/admin/products/" + id + "/images", null, body).andExpect(status().isUnauthorized());
    }

    @Test
    void unsafeImageUrlsAreRejected() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID id = createProduct(staff, "unsafe-image-product");
        for (String bad : List.of("javascript:alert(1)", "data:text/html;base64,AAAA", "http://insecure.example.com/a.jpg",
                "/media/a b.svg", "//evil.example.com/a.jpg")) {
            sendJson("PUT", "/api/admin/products/" + id + "/images", staff,
                    new ReplaceImagesRequest(List.of(new ImageRequest(bad, "x"))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors").exists());
        }
        List<ImageRequest> nine = java.util.Collections.nCopies(9, new ImageRequest("/media/a.svg", "x"));
        sendJson("PUT", "/api/admin/products/" + id + "/images", staff, new ReplaceImagesRequest(nine))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reservedSlugIsRefused() throws Exception {
        sendJson("POST", "/api/admin/products", tokenFor(Role.STAFF), newProduct("facets"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void stockCannotBeSetBelowWhatIsAlreadyReserved() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID variantId = createVariant(staff, tokenFor(Role.ADMIN), "reserved-stock-product", "RS-1");
        Variant v = variantRepository.findById(variantId).orElseThrow();
        org.springframework.test.util.ReflectionTestUtils.setField(v, "reservedQty", 20);
        variantRepository.saveAndFlush(v);

        sendJson("PUT", "/api/admin/variants/" + variantId, staff,
                new UpdateVariantRequest("M", "Black", null, 1, new BigDecimal("8.00"), 19, true, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Stock cannot be set below the quantity already reserved (20)."));
        sendJson("PUT", "/api/admin/variants/" + variantId, staff,
                new UpdateVariantRequest("M", "Black", null, 1, new BigDecimal("8.00"), 20, true, null))
                .andExpect(status().isOk());
    }

    @Test
    void auditEntryCarriesTheRequestsCorrelationId() throws Exception {
        String staff = tokenFor(Role.STAFF);
        String requestId = "trace-0123456789";
        String response = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/admin/products").header("Authorization", staff).header("X-Request-Id", requestId)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(newProduct("correlated-product"))))
                .andExpect(status().isCreated())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .header().string("X-Request-Id", requestId))
                .andReturn().getResponse().getContentAsString();
        UUID id = UUID.fromString(objectMapper.readTree(response).get("id").asText());

        assertThat(auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("PRODUCT", id).get(0)
                .getCorrelationId()).isEqualTo(requestId);
    }

    @Test
    void sectionsAndCutsCanBeAddedRenamedHiddenReorderedAndDeleted() throws Exception {
        String staff = tokenFor(Role.STAFF);

        // Name in, slug out; a second term with the same name gets its own slug.
        JsonNode first = json(sendJson("POST", "/api/admin/terms", staff,
                new CreateTermRequest(TermKind.SECTION, "Mid-Long Socks", "Longer than crew")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("mid-long-socks")).andExpect(jsonPath("$.productCount").value(0)));
        JsonNode second = json(sendJson("POST", "/api/admin/terms", staff,
                new CreateTermRequest(TermKind.SECTION, "Mid-Long Socks", null)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("mid-long-socks-2")));
        UUID firstId = UUID.fromString(first.get("id").asText());
        UUID secondId = UUID.fromString(second.get("id").asText());
        assertThat(second.get("position").asInt()).isGreaterThan(first.get("position").asInt());

        // Rename and hide: hidden terms leave the public menus but stay in the admin list.
        sendJson("PUT", "/api/admin/terms/" + secondId, staff, new UpdateTermRequest("Mid-Long (old)", null, false))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));
        getJson("/api/catalog/terms", null).andExpect(jsonPath("$.sections[?(@.slug=='mid-long-socks-2')]").isEmpty())
                .andExpect(jsonPath("$.sections[?(@.slug=='mid-long-socks')].description").value("Longer than crew"));
        getJson("/api/admin/terms?kind=SECTION", staff).andExpect(jsonPath("$[?(@.slug=='mid-long-socks-2')].active").value(false));

        // A hidden term cannot be newly assigned to a product.
        sendJson("POST", "/api/admin/products", staff, new CreateProductRequest(null, "Hidden Term Try", Category.MEN,
                secondId, null, null, null, null, null, null, null)).andExpect(status().isBadRequest());

        // Assign the visible one, then deleting it is refused while a product uses it.
        JsonNode product = json(sendJson("POST", "/api/admin/products", staff, new CreateProductRequest(null,
                "Sectioned Sock", Category.MEN, firstId, null, null, null, null, null, null, null))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.section.name").value("Mid-Long Socks")));
        sendJson("DELETE", "/api/admin/terms/" + firstId, staff, java.util.Map.of())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("used by 1 product")));
        getJson("/api/products?section=mid-long-socks", null).andExpect(jsonPath("$.totalItems").value(1));

        // Unused terms delete cleanly and leave an audit trail.
        sendJson("DELETE", "/api/admin/terms/" + secondId, staff, java.util.Map.of()).andExpect(status().isNoContent());
        assertThat(auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("TERM", secondId))
                .extracting(AuditLogEntry::getAction).containsExactly("TERM_DELETED", "TERM_UPDATED", "TERM_CREATED");
        assertThat(product.get("slug").asText()).isEqualTo("sectioned-sock");
    }

    @Test
    void termsCanBeReorderedAndBadOrderListsAreRejected() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID a = createTerm(staff, TermKind.CUT, "Order A");
        UUID b = createTerm(staff, TermKind.CUT, "Order B");
        UUID c = createTerm(staff, TermKind.CUT, "Order C");
        List<UUID> all = new java.util.ArrayList<>();
        json(getJson("/api/admin/terms?kind=CUT", staff)).forEach(n -> all.add(UUID.fromString(n.get("id").asText())));
        // Put C first, then B, A, keep everything else after them in the existing order.
        List<UUID> wanted = new java.util.ArrayList<>(List.of(c, b, a));
        sendJson("POST", "/api/admin/terms/reorder", staff, new ReorderTermsRequest(TermKind.CUT, wanted))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(c.toString()))
                .andExpect(jsonPath("$[1].id").value(b.toString()))
                .andExpect(jsonPath("$[2].id").value(a.toString()));
        // Duplicates, unknown ids and ids of the other kind are refused.
        sendJson("POST", "/api/admin/terms/reorder", staff, new ReorderTermsRequest(TermKind.CUT, List.of(a, a)))
                .andExpect(status().isBadRequest());
        sendJson("POST", "/api/admin/terms/reorder", staff, new ReorderTermsRequest(TermKind.CUT, List.of(UUID.randomUUID())))
                .andExpect(status().isBadRequest());
        sendJson("POST", "/api/admin/terms/reorder", staff,
                new ReorderTermsRequest(TermKind.SECTION, List.of(a))).andExpect(status().isBadRequest());
        assertThat(all).contains(a, b, c);
    }

    @Test
    void termManagementNeedsALogin() throws Exception {
        sendJson("POST", "/api/admin/terms", null, new CreateTermRequest(TermKind.SECTION, "X", null)).andExpect(status().isUnauthorized());
        sendJson("POST", "/api/admin/terms", tokenFor(Role.CUSTOMER), new CreateTermRequest(TermKind.SECTION, "X", null))
                .andExpect(status().isForbidden());
        sendJson("POST", "/api/admin/terms", tokenFor(Role.STAFF), new CreateTermRequest(TermKind.SECTION, "  ", null))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.name").exists());
    }

    @Test
    void slugIsMadeFromTheNameWhenOmittedAndStaysUnique() throws Exception {
        String staff = tokenFor(Role.STAFF);
        CreateProductRequest noSlug = new CreateProductRequest(null, "Ak&Ven Mid-Long Socks!", Category.WOMEN, null, null,
                null, null, null, null, null, null);
        sendJson("POST", "/api/admin/products", staff, noSlug).andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("ak-ven-mid-long-socks"));
        sendJson("POST", "/api/admin/products", staff, noSlug).andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("ak-ven-mid-long-socks-2"));
    }

    @Test
    void retiredProductsCanBeRestoredAndTheListFiltersByStatusAndName() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID id = createProduct(staff, "restorable-product");
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .delete("/api/admin/products/" + id).header("Authorization", staff)).andExpect(status().isNoContent());

        getJson("/api/admin/products?q=Admin Flow&status=retired&pageSize=100", staff)
                .andExpect(jsonPath("$.items[?(@.slug=='restorable-product')]").isNotEmpty());
        getJson("/api/admin/products?status=active&pageSize=100", staff)
                .andExpect(jsonPath("$.items[?(@.slug=='restorable-product')]").isEmpty());

        sendJson("POST", "/api/admin/products/" + id + "/restore", staff, java.util.Map.of())
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(true)).andExpect(jsonPath("$.retiredAt").doesNotExist());
        getJson("/api/products/restorable-product", null).andExpect(status().isOk());
        assertThat(auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("PRODUCT", id))
                .extracting(AuditLogEntry::getAction).contains("PRODUCT_RETIRED", "PRODUCT_RESTORED");
    }

    @Test
    void colourSwatchIsStoredUpperCaseAndMustBeAHexColour() throws Exception {
        String staff = tokenFor(Role.STAFF), admin = tokenFor(Role.ADMIN);
        UUID productId = createProduct(staff, "swatch-product");
        sendJson("POST", "/api/admin/products/" + productId + "/variants", admin, newVariant("SW-1"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.colorHex").value("#1F1D1A"));
        sendJson("POST", "/api/admin/products/" + productId + "/variants", admin,
                new CreateVariantRequest("SW-2", "M", "Red", "red", 1, new BigDecimal("8"), new BigDecimal("4"), new BigDecimal("15"), 5))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.colorHex").exists());
    }

    // ---- photo upload -----------------------------------------------------------------------

    private static final byte[] PNG = java.util.Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    private org.springframework.test.web.servlet.ResultActions upload(String token, UUID productId, String filename,
                                                                      String contentType, byte[] bytes) throws Exception {
        var file = new org.springframework.mock.web.MockMultipartFile("file", filename, contentType, bytes);
        var request = org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .multipart("/api/admin/products/" + productId + "/images/upload").file(file).param("alt", "Front view");
        if (token != null) request.header("Authorization", token);
        return mockMvc.perform(request);
    }

    @Autowired private com.akven.thesis.media.MediaStorage mediaStorage;

    @Test
    void aPhotoCanBeUploadedServedAndRemoved() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID id = createProduct(staff, "photo-product");

        JsonNode product = json(upload(staff, id, "front.png", "image/png", PNG).andExpect(status().isOk())
                .andExpect(jsonPath("$.images[0].alt").value("Front view")));
        String url = product.get("images").get(0).get("url").asText();
        assertThat(url).startsWith("/media/uploads/").endsWith(".png");

        // Anyone can fetch it (it is a product photo), with the right type and a long cache lifetime.
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(url))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().contentType("image/png"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().string("Cache-Control",
                        org.hamcrest.Matchers.containsString("max-age=")));
        getJson("/api/products/photo-product", null).andExpect(jsonPath("$.images[0].url").value(url));

        // Removing it from the gallery also removes the file from disk.
        java.nio.file.Path file = mediaStorage.uploadDir().resolve(url.substring("/media/uploads/".length()));
        assertThat(file).exists();
        sendJson("PUT", "/api/admin/products/" + id + "/images", staff, new ReplaceImagesRequest(List.of()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.images.length()").value(0));
        assertThat(file).doesNotExist();
    }

    @Test
    void uploadsAreCheckedByContentNotByName() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID id = createProduct(staff, "hostile-upload-product");
        byte[] script = "<script>alert(1)</script>".getBytes();
        byte[] svg = "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>".getBytes();
        byte[] gif = "GIF89a\u0001\u0000".getBytes();

        upload(staff, id, "evil.png", "image/png", script).andExpect(status().isBadRequest());      // html named .png
        upload(staff, id, "logo.svg", "image/svg+xml", svg).andExpect(status().isBadRequest());      // svg can carry scripts
        upload(staff, id, "anim.gif", "image/gif", gif).andExpect(status().isBadRequest());          // not an accepted type
        upload(staff, id, "empty.png", "image/png", new byte[0]).andExpect(status().isBadRequest());
        upload(staff, id, "huge.png", "image/png", java.util.stream.IntStream.range(0, 5 * 1024 * 1024 + 1)
                .collect(java.io.ByteArrayOutputStream::new, (o, i) -> o.write(i == 0 ? 0x89 : 0), (x, y) -> { })
                .toByteArray()).andExpect(status().isBadRequest());

        // A real PNG under a hostile name is stored under OUR random name: no path tricks are possible.
        String url = json(upload(staff, id, "../../etc/passwd.png", "image/png", PNG).andExpect(status().isOk()))
                .get("images").get(0).get("url").asText();
        assertThat(url).matches("/media/uploads/[0-9a-f-]{36}\\.png");
    }

    @Test
    void uploadsNeedAStaffLoginAndAreCappedAtEightPhotos() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID id = createProduct(staff, "gallery-cap-product");
        upload(null, id, "a.png", "image/png", PNG).andExpect(status().isUnauthorized());
        upload(tokenFor(Role.CUSTOMER), id, "a.png", "image/png", PNG).andExpect(status().isForbidden());
        for (int i = 0; i < 8; i++) upload(staff, id, "p" + i + ".png", "image/png", PNG).andExpect(status().isOk());
        upload(staff, id, "p9.png", "image/png", PNG).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("A product can have at most 8 photos."));
    }

    @Test
    void auditTrailIsAdminOnly() throws Exception {
        UUID id = createProduct(tokenFor(Role.STAFF), "audit-visible-product");
        getJson("/api/admin/products/" + id + "/audit", tokenFor(Role.STAFF)).andExpect(status().isForbidden());
        getJson("/api/admin/products/" + id + "/audit", tokenFor(Role.ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").value("PRODUCT_CREATED"));
    }

    // ---- helpers ---------------------------------------------------------------------------

    private static CreateProductRequest newProduct(String slug) {
        return new CreateProductRequest(slug, "Admin Flow Product", Category.MEN, null, null,
                "AdminCol", "desc", "100% cotton", "Premium", "Wash cold", "Korea");
    }

    private static CreateVariantRequest newVariant(String sku) {
        return new CreateVariantRequest(sku, "M", "Black", "#1f1d1a", 1, new BigDecimal("8.00"), new BigDecimal("4.00"),
                new BigDecimal("15.00"), 50);
    }

    private UUID createTerm(String token, TermKind kind, String name) throws Exception {
        JsonNode node = json(sendJson("POST", "/api/admin/terms", token, new CreateTermRequest(kind, name, null))
                .andExpect(status().isCreated()));
        return UUID.fromString(node.get("id").asText());
    }

    private UUID createProduct(String token, String slug) throws Exception {
        JsonNode node = json(sendJson("POST", "/api/admin/products", token, newProduct(slug)).andExpect(status().isCreated()));
        return UUID.fromString(node.get("id").asText());
    }

    private UUID createVariant(String staff, String admin, String slug, String sku) throws Exception {
        UUID productId = createProduct(staff, slug);
        JsonNode node = json(sendJson("POST", "/api/admin/products/" + productId + "/variants", admin, newVariant(sku))
                .andExpect(status().isCreated()));
        return UUID.fromString(node.get("id").asText());
    }

    @Autowired private VariantRepository variantRepository;

    private BigDecimal floorOf(UUID variantId) {
        return variantRepository.findById(variantId).orElseThrow().getMarginFloorPct();
    }
}
