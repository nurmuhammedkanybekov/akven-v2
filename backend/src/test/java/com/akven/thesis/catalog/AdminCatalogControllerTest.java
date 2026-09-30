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
                new UpdateProductRequest("Renamed", Category.WOMEN, Cut.ANKLE, Occasion.SPORT, "AdminCol", "new", "cotton"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed"))
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
                new CreateProductRequest("bad-bundle", "Bad", Category.BUNDLES, Cut.CREW, null, null, null, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Bundles cannot have a cut or an occasion."));
    }

    @Test
    void validationErrorsListTheOffendingFields() throws Exception {
        sendJson("POST", "/api/admin/products", tokenFor(Role.STAFF),
                new CreateProductRequest("Bad Slug!", "", null, null, null, null, null, null))
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
                new UpdateVariantRequest("L", "Navy", 3, new BigDecimal("9.50"), 77, true, null))
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
                new UpdateVariantRequest("M", "Black", 1, new BigDecimal("3.99"), 10, true, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Price cannot be lower than the cost price."));
    }

    @Test
    void staleVersionIsRejectedWith409() throws Exception {
        String staff = tokenFor(Role.STAFF);
        UUID variantId = createVariant(staff, tokenFor(Role.ADMIN), "stale-product", "ST-1");

        // First edit succeeds and bumps the version; replaying the old version must be refused.
        sendJson("PUT", "/api/admin/variants/" + variantId, staff,
                new UpdateVariantRequest("M", "Black", 1, new BigDecimal("8.00"), 10, true, 0)).andExpect(status().isOk());
        sendJson("PUT", "/api/admin/variants/" + variantId, staff,
                new UpdateVariantRequest("M", "Black", 1, new BigDecimal("9.00"), 10, true, 0)).andExpect(status().isConflict());
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
                new UpdateVariantRequest("M", "Black", 1, new BigDecimal("8.00"), 19, true, null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Stock cannot be set below the quantity already reserved (20)."));
        sendJson("PUT", "/api/admin/variants/" + variantId, staff,
                new UpdateVariantRequest("M", "Black", 1, new BigDecimal("8.00"), 20, true, null))
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
    void auditTrailIsAdminOnly() throws Exception {
        UUID id = createProduct(tokenFor(Role.STAFF), "audit-visible-product");
        getJson("/api/admin/products/" + id + "/audit", tokenFor(Role.STAFF)).andExpect(status().isForbidden());
        getJson("/api/admin/products/" + id + "/audit", tokenFor(Role.ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").value("PRODUCT_CREATED"));
    }

    // ---- helpers ---------------------------------------------------------------------------

    private static CreateProductRequest newProduct(String slug) {
        return new CreateProductRequest(slug, "Admin Flow Product", Category.MEN, Cut.CREW, Occasion.EVERYDAY,
                "AdminCol", "desc", "100% cotton");
    }

    private static CreateVariantRequest newVariant(String sku) {
        return new CreateVariantRequest(sku, "M", "Black", 1, new BigDecimal("8.00"), new BigDecimal("4.00"),
                new BigDecimal("15.00"), 50);
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
