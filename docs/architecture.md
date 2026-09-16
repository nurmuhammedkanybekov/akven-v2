# Ak&Ven — Architecture

See [`architecture-diagram.svg`](./architecture-diagram.svg) for the system diagram this document describes.

## Why this shape

Ak&Ven is one brand (Korean-made socks, sold at Dordoi Bazaar and — this
thesis — online) with a small, fixed catalog, built by one developer on an
8-week runway to Milestone 3. The architecture is deliberately sized for
that, not for the multi-tenant, plugin-driven scale of the open-source
platforms it borrows patterns from (Shopizer for the Java/Spring/JWT shape,
Medusa/Saleor/Vendure for keeping the admin panel as just another client of
one API rather than a separate privileged system).

## The three layers

1. **Client layer** — a single installable PWA. Customer and admin views are
   the same frontend app with role-gated routes, not two separate apps.
2. **API + negotiation layer** — one Spring Boot service (`backend/`), JWT +
   RBAC (`CUSTOMER` / `STAFF` / `ADMIN`), containing:
   - **Catalog & Orders** — browsing, cart, checkout via Apple Pay / Google
     Pay (tokenized only — no card data touches this server).
   - **Negotiation** — the LLM + RAG pipeline. Built in Phase 2.
   - **Audit Log** — every admin mutation recorded (actor, before/after),
     carried over from the Nevis IAM & Audit Logging project's pattern.
3. **Data / ML layer** — PostgreSQL with the `pgvector` extension for
   product/policy embeddings, in one database rather than a separate vector
   store, to keep operational complexity down.

## The mechanism that matters: the Policy Validator

The LLM never sets a price. It proposes a discount as data; `PolicyValidator`
(`backend/src/main/java/com/akven/thesis/negotiation/PolicyValidator.java`)
is the only code allowed to turn that proposal into something that can touch
an order, and it does so by clamping it to the variant's stored margin floor
— deterministic, independent of the model call, and immune to prompt
injection by construction: it doesn't matter what a customer talks the LLM
into saying, only what the validator allows through.

This is both the security boundary and the thesis's core technical
contribution — the `NegotiationSession` entity logs the LLM's raw proposal
and the validator's actual output separately, so the gap between them is
visible evidence for the defense.

## Data model

| Entity | Purpose |
|---|---|
| `Product` / `Variant` | A sock style and its sellable SKUs (size, color, pack size), with `marginFloorPct` per variant |
| `Order` / `OrderItem` | What was actually sold, at the validator-checked `agreedPrice` |
| `NegotiationSession` | One chat: `proposedDiscountPct` (LLM, untrusted) vs `validatedDiscountPct` (enforced) |
| `User` | `CUSTOMER` / `STAFF` / `ADMIN`, same table, role-gated access |
| `AuditLogEntry` | One row per admin mutation |

## Status

- [x] Architecture decided and documented (this file + diagram)
- [x] Backend skeleton: module structure, entities, repositories, Flyway
      migration, health check (`/actuator/health`), context-load test
- [x] Frontend PWA shell placeholder (manifest + service worker registration)
- [ ] Use-case diagram — next
- [ ] Wireframes for the 5 key screens — next
- [ ] Real negotiation pipeline, auth (ported from Nevis), checkout — Phase 1–2

## Security

See the full checklist (negotiator safety, auth/access, payments, operational)
in the Ak&Ven Architecture reference doc maintained alongside the thesis
plan. Summary of what's already reflected in this skeleton:

- Passwords are never stored in plaintext (`passwordHash` field; hashing
  algorithm choice — Argon2 or bcrypt — lands with the ported auth code).
- `Variant.costPrice` and `marginFloorPct` are admin-only fields — the
  catalog controller must not expose them on customer-facing endpoints.
- Secrets (`LLM_API_KEY`, payment merchant IDs) are read from environment
  variables only (`application.yml`) — never committed.
- `SecurityConfig` currently permits all requests; this is a placeholder,
  tracked with a `TODO` to replace before Milestone 2.
