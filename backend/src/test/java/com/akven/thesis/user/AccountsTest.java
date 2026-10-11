package com.akven.thesis.user;

import com.akven.thesis.support.IntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * UC-8 and UC-9: the super admin runs the accounts and reads the audit log, owners and staff cannot; a super admin can
 * also do everything an owner can; and a disabled account or a new password ends the sessions signed in before it.
 */
class AccountsTest extends IntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private JdbcTemplate jdbc;

    private static String email(String who) { return who + "-" + UUID.randomUUID().toString().substring(0, 8) + "@akven.test"; }

    private JsonNode create(String token, String email, String role) throws Exception {
        return json(sendJson("POST", "/api/admin/accounts", token,
                Map.of("email", email, "displayName", "Venera", "role", role, "password", "a-good-password"))
                .andExpect(status().isCreated()));
    }

    private String login(String email, String password) throws Exception {
        return "Bearer " + json(sendJson("POST", "/api/auth/login", null, Map.of("email", email, "password", password))
                .andExpect(status().isOk())).get("token").asText();
    }

    @Test
    void theSuperAdminCreatesAnOwnerWhoCanSignInAndRunTheShop() throws Exception {
        String sup = tokenFor(Role.SUPER_ADMIN);
        String mail = email("owner");
        JsonNode owner = create(sup, mail.toUpperCase(), "ADMIN");
        assertThat(owner.get("email").asText()).isEqualTo(mail);
        assertThat(owner.get("displayName").asText()).isEqualTo("Venera");
        assertThat(owner.has("password")).isFalse();
        assertThat(owner.has("passwordHash")).isFalse();

        String token = login(mail, "a-good-password");
        getJson("/api/admin/shop/contacts", token).andExpect(status().isOk());
        getJson("/api/admin/accounts", token).andExpect(status().isForbidden());

        sendJson("POST", "/api/admin/accounts", sup, Map.of("email", mail, "role", "STAFF", "password", "another-password"))
                .andExpect(status().isConflict());
        JsonNode team = json(getJson("/api/admin/accounts", sup).andExpect(status().isOk()));
        assertThat(team.findValuesAsText("email")).contains(mail).doesNotContain("customer-it@akven.test");
    }

    @Test
    void aSuperAdminCanDoWhatAnOwnerCan() throws Exception {
        String sup = tokenFor(Role.SUPER_ADMIN);
        getJson("/api/admin/shop/contacts", sup).andExpect(status().isOk());        // owner-only service method
        getJson("/api/admin/negotiations/stats", sup).andExpect(status().isOk());   // staff and owner URL rule
        getJson("/api/admin/customers", sup).andExpect(status().isOk());
    }

    @Test
    void onlyTheSuperAdminManagesAccountsAndNoOneCanMakeOrChangeASuperAdmin() throws Exception {
        for (Role role : new Role[]{Role.ADMIN, Role.STAFF}) {
            getJson("/api/admin/accounts", tokenFor(role)).andExpect(status().isForbidden());
            getJson("/api/admin/audit", tokenFor(role)).andExpect(status().isForbidden());
            sendJson("POST", "/api/admin/accounts", tokenFor(role), Map.of("email", email("x"), "role", "STAFF", "password", "a-good-password"))
                    .andExpect(status().isForbidden());
        }
        getJson("/api/admin/accounts", tokenFor(Role.CUSTOMER)).andExpect(status().isForbidden());

        String sup = tokenFor(Role.SUPER_ADMIN);
        sendJson("POST", "/api/admin/accounts", sup, Map.of("email", email("boss"), "role", "SUPER_ADMIN", "password", "a-good-password"))
                .andExpect(status().isBadRequest());
        sendJson("POST", "/api/admin/accounts", sup, Map.of("email", email("cust"), "role", "CUSTOMER", "password", "a-good-password"))
                .andExpect(status().isBadRequest());
        UUID self = users.findByEmail("super_admin-it@akven.test").orElseThrow().getId();
        sendJson("PUT", "/api/admin/accounts/" + self, sup, Map.of("role", "STAFF", "active", false)).andExpect(status().isNotFound());
        sendJson("PUT", "/api/admin/accounts/" + self + "/password", sup, Map.of("password", "a-good-password")).andExpect(status().isNotFound());
        sendJson("POST", "/api/admin/accounts", sup, Map.of("email", email("short"), "role", "STAFF", "password", "short"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void disablingAnAccountEndsItsSessionsAtOnce() throws Exception {
        String sup = tokenFor(Role.SUPER_ADMIN);
        String mail = email("helper");
        String id = create(sup, mail, "STAFF").get("id").asText();
        String token = login(mail, "a-good-password");
        getJson("/api/admin/orders", token).andExpect(status().isOk());

        sendJson("PUT", "/api/admin/accounts/" + id, sup, Map.of("displayName", "Helper", "role", "STAFF", "active", false))
                .andExpect(status().isOk()).andExpect(jsonPath("$.active").value(false));
        getJson("/api/admin/orders", token).andExpect(status().isUnauthorized());
        sendJson("POST", "/api/auth/login", null, Map.of("email", mail, "password", "a-good-password")).andExpect(status().isUnauthorized());
    }

    @Test
    void aRoleChangeAppliesToTheNextRequestWithoutSigningInAgain() throws Exception {
        String sup = tokenFor(Role.SUPER_ADMIN);
        String mail = email("promoted");
        String id = create(sup, mail, "STAFF").get("id").asText();
        String token = login(mail, "a-good-password");
        getJson("/api/admin/shop/contacts", token).andExpect(status().isForbidden());
        sendJson("PUT", "/api/admin/accounts/" + id, sup, Map.of("role", "ADMIN", "active", true)).andExpect(status().isOk());
        getJson("/api/admin/shop/contacts", token).andExpect(status().isOk());
    }

    @Test
    void aNewPasswordEndsTheOldSessionsAndTheOldPassword() throws Exception {
        String sup = tokenFor(Role.SUPER_ADMIN);
        String mail = email("forgot");
        String id = create(sup, mail, "STAFF").get("id").asText();
        String old = login(mail, "a-good-password");
        // A token issued a few seconds before the reset, so it is clearly older than the change.
        jdbc.update("update app_user set credentials_changed_at = dateadd('SECOND', 5, current_timestamp) where id = ?", UUID.fromString(id));
        getJson("/api/auth/me", old).andExpect(status().isUnauthorized());
        jdbc.update("update app_user set credentials_changed_at = null where id = ?", UUID.fromString(id));

        sendJson("PUT", "/api/admin/accounts/" + id + "/password", sup, Map.of("password", "the-new-password")).andExpect(status().isNoContent());
        sendJson("POST", "/api/auth/login", null, Map.of("email", mail, "password", "a-good-password")).andExpect(status().isUnauthorized());
        getJson("/api/auth/me", login(mail, "the-new-password")).andExpect(status().isOk());
    }

    @Test
    void everyAccountChangeIsInTheAuditLogWithWhoDidIt() throws Exception {
        String sup = tokenFor(Role.SUPER_ADMIN);
        String mail = email("audited");
        create(sup, mail, "STAFF");
        JsonNode log = json(getJson("/api/admin/audit?pageSize=100", sup).andExpect(status().isOk()));
        JsonNode created = null;
        for (JsonNode e : log.get("items")) if (e.get("action").asText().equals("ACCOUNT_CREATED") && e.get("after").asText().contains(mail)) created = e;
        assertThat(created).isNotNull();
        assertThat(created.get("actor").asText()).isEqualTo("super_admin-it@akven.test");
        assertThat(created.get("after").asText()).doesNotContain("password");
    }

    @Test
    void ownersFindCustomersByEmailToMarkTrustedOnes() throws Exception {
        String mail = email("buyer");
        tokenForEmail(mail, Role.CUSTOMER);
        String owner = tokenFor(Role.ADMIN);
        JsonNode found = json(getJson("/api/admin/customers?q=" + mail.substring(0, 14), owner).andExpect(status().isOk()));
        assertThat(found.get("items")).hasSize(1);
        assertThat(found.get("items").get(0).get("trusted").asBoolean()).isFalse();
        getJson("/api/admin/customers", tokenFor(Role.STAFF)).andExpect(status().isForbidden());
    }
}
