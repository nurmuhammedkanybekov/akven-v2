package com.akven.thesis.user;

/**
 * RBAC roles — same API serves the customer storefront and the admin panel, gated by role.
 * SUPER_ADMIN runs the system (accounts, the AI assistant, the audit log) and can also do everything an ADMIN (an owner)
 * can; see the role hierarchy in SecurityConfig.
 */
public enum Role {
    CUSTOMER,
    STAFF,
    ADMIN,
    SUPER_ADMIN
}
