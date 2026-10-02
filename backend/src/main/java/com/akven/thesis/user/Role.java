package com.akven.thesis.user;

/** RBAC roles — same API serves the customer storefront and the admin panel, gated by role. */
public enum Role {
    CUSTOMER,
    STAFF,
    ADMIN
}
