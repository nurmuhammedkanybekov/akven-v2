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
 * Metadata for the API docs at /swagger-ui/index.html (demo mode only). springdoc scans every @RestController, and
 * the bearer-JWT scheme makes "Authorize" in the Swagger UI work with a token from /api/auth/login.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI akVenOpenApi() {
        final String bearerScheme = "bearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("AK&VEN API")
                        .description("Catalogue, negotiation, orders and administration API of the AK&VEN shop. "
                                + "The catalogue, the price quote, the shop information, wholesale requests and checkout are public; "
                                + "everything else requires a bearer token, and /api/admin/** requires a team role.")
                        .version("1.0")
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
