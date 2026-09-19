package com.akven.thesis.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.Components;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Metadata for the live API docs at /swagger-ui/index.html (springdoc scans
 * every @RestController automatically — no per-endpoint annotation required
 * to show up here, though richer @Operation/@Schema annotations can be added
 * incrementally as real request/response bodies land in Phase 1–2).
 *
 * Bearer-JWT scheme is declared now even though JwtAuthenticationFilter is
 * still a stub (see that class) — once real tokens exist, "Authorize" in the
 * Swagger UI works immediately with no further config here.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI akVenOpenApi() {
        final String bearerScheme = "bearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("Ak&Ven API")
                        .description("Catalog, negotiation, orders, and admin API for the Ak&Ven thesis project. "
                                + "Public endpoints: GET /api/products/**. Everything else requires a bearer token; "
                                + "/api/admin/** additionally requires STAFF or ADMIN.")
                        .version("v0.1 (Milestone 1 skeleton)")
                        .contact(new Contact().name("Nurmuhammed").url("https://szofttech.inf.elte.hu/gnn/thesis-bachelor-2026-2027-01/nurmuhammed")))
                .addSecurityItem(new SecurityRequirement().addList(bearerScheme))
                .components(new Components().addSecuritySchemes(bearerScheme,
                        new SecurityScheme()
                                .name(bearerScheme)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
