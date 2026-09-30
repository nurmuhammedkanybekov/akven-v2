# Ak&Ven — Architecture

See [`diagrams/01-architecture-overview.svg`](./diagrams/01-architecture-overview.svg) for the system diagram this document describes, [`diagrams/02-negotiation-validation-path.svg`](./diagrams/02-negotiation-validation-path.svg) for the Policy Validator trust boundary, [`diagrams/03-sequence-negotiation-turn.svg`](./diagrams/03-sequence-negotiation-turn.svg) for one negotiation turn, and [`diagrams/04-er-data-model.svg`](./diagrams/04-er-data-model.svg) for the data model.

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

### Schema design decisions worth calling out at the defense

The Flyway migration (`db/migration/V1__init_schema.sql`) does more than
declare columns — several decisions are deliberately enforced at the
database level, not just in application code, because a thesis defense
question about data integrity should have a stronger answer than "the
service layer checks that":

- **Optimistic locking (`version` column)** on `app_user`, `product`,
  `variant`, and `customer_order` — the four tables with realistic
  concurrent writers (two staff editing the same SKU, a stock update racing
  a checkout). Backed by JPA's `@Version` via a shared `AuditableEntity`
  base class, so a lost-update race throws instead of silently discarding
  one write.
- **Inventory holds (`stock_qty` / `reserved_qty` / `available_qty`)** —
  `available_qty` is a generated column (`stock_qty - reserved_qty`),
  computed by Postgres, not by the app. A cart hold reserves stock without
  ever letting `stock_qty` itself go negative (`CHECK (stock_qty >=
  reserved_qty)`).
- **The margin-safety invariant lives in two places on purpose.**
  `PolicyValidator` enforces it in code; the `negotiation_session` table
  also has `CHECK (validated_discount_pct <= proposed_discount_pct)`, and
  the `NegotiationSession` entity re-asserts it with a Bean Validation
  `@AssertTrue`. If the service layer ever has a bug, the row still can't
  be written — the same defense-in-depth argument as the Policy Validator
  itself, one layer lower.
- **Soft delete for `product`** (`is_active` / `retired_at`) instead of
  `DELETE` — a retired product must stay intact for historical orders
  (FR-10). `variant`/`customer_order` foreign keys default to `ON DELETE
  RESTRICT` for the same reason; `order_item` is the one deliberate
  `CASCADE` (deleting an order legitimately deletes its lines).
- **Case-insensitive email uniqueness** via a functional unique index
  (`lower(email)`), not a `citext` column — one fewer extension to depend
  on for the same guarantee.
- **`before_state`/`after_state` on `audit_log_entry` are `jsonb`**, mapped
  with Hibernate 6's native `@JdbcTypeCode(SqlTypes.JSON)` — queryable and
  diffable by admin tooling later without deserializing in application code
  first.
- **`product_embedding` is chunk-aware** (`chunk_index`, unique per
  `variant_id`) rather than one row per variant — real RAG grounding
  usually needs more than one embedded passage per SKU (description,
  policy notes, etc.), and an `ivfflat` index is created now so Phase 2
  doesn't need a breaking migration, only a `REINDEX` once real embeddings
  exist.
- **Seed data (`V2__seed_demo_data.sql`)** gives the catalog a handful of
  realistic products/variants for local development and defense
  screenshots; demo passwords are hashed in-migration with pgcrypto's
  `crypt(..., gen_salt('bf'))` rather than committed as plaintext anywhere.

Verified by actually running both migrations against a real
PostgreSQL 16 + pgvector instance (not just reviewed by eye), including the
constraint failures above firing correctly (bad role, stock/reserved
violation, margin-invariant violation, duplicate email by case, and
`ON DELETE RESTRICT` blocking a product delete while variants exist).

## Status

**Milestone 1 (due 25 Sept) — complete, pushed to GitLab:**

- [x] Architecture decided and documented (this file + diagram — v2, redrawn to show
      the three layers as explicit swimlanes, both external system actors including
      Payment Provider, and the Policy Validator's exact place in the request path)
- [x] Backend skeleton: module structure, entities, repositories, Flyway
      migration (schema + seed data), health check (`/actuator/health`),
      context-load test
- [x] Database schema hardened: constraints, indexes, optimistic locking,
      soft delete, audit trail as `jsonb`, chunk-aware RAG table — see above
- [x] Frontend PWA shell: complete manifest with real generated icons
      (installable), a service worker that actually caches and serves the
      shell offline
- [x] CI/build hygiene: JUnit test reports wired into GitLab's CI reports,
      dependency cache keyed on `pom.xml`, UTF-8 build encoding pinned
- [x] Live API docs: springdoc-openapi wired in (`/swagger-ui/index.html`,
      `/v3/api-docs`) — every `@RestController` shows up automatically, bearer-JWT
      scheme pre-declared so "Authorize" works the moment real tokens exist
- [x] Use-case diagram, wireframes (full device matrix), requirement analysis (incl. NFR-11)

**Milestone 2 (due 20 Oct) — in progress:**

- [x] Real authentication: `POST /api/auth/register`, `/login`, `/me`, backed by a real
      `JwtAuthenticationFilter` and a Spring Security `UserDetailsService` — see Security below
- [ ] Full catalog API (product detail + variants, admin management)
- [ ] Cart & checkout, simulated Apple Pay / Google Pay tokenization, inventory holds
- [ ] Negotiation endpoint with a rule-based stand-in behind the same contract the real
      LLM will use in Milestone 3 — `PolicyValidator` already proven correct either way
- [ ] React frontend (catalog, cart/checkout, negotiate, minimal admin view), using the
      high-fidelity design direction (`docs/design-direction.html`) now locked in as scope
- [ ] `requirement-analysis.md` / use-case diagram updated for the Home screen and
      Men/Women/Kids/Bundles taxonomy that comes with locking in that design direction

## Security

See the full checklist (negotiator safety, auth/access, payments, operational)
in the Ak&Ven Architecture reference doc maintained alongside the thesis
plan. Summary of what's already reflected in this codebase:

- Passwords are never stored in plaintext — `passwordHash` (bcrypt, via the
  `PasswordEncoder` bean in `SecurityConfig`); demo/seed passwords are hashed
  the same way with pgcrypto directly in the migration, never committed as
  plaintext. Real accounts go through the same encoder via
  `POST /api/auth/register`.
- `Variant.costPrice` and `marginFloorPct` are admin-only fields — the
  catalog controller must not expose them on customer-facing endpoints;
  `marginFloorPct` writes will be restricted to `ADMIN` at the service
  layer (FR-11) once catalog-management endpoints exist (Milestone 2).
- Secrets (`JWT_SECRET`, `LLM_API_KEY`, payment merchant IDs) are read from
  environment variables only (`application.yml`) — never committed. The
  in-repo default for `JWT_SECRET` is explicitly dev-only; anywhere this
  runs beyond a laptop needs a real random secret set via the environment.
- `SecurityConfig` has real shape: catalog `GET` and `/api/auth/register`
  `/login` are public, `/api/admin/**` requires `STAFF`/`ADMIN`, everything
  else requires authentication, and method security
  (`@EnableMethodSecurity`) is on for finer-grained rules like FR-11.
- **`JwtAuthenticationFilter` now actually verifies tokens (Milestone 2)** —
  it parses the `Authorization: Bearer` header, verifies the signature and
  expiry via `JwtService`, and populates the `SecurityContext` from the
  token's claims; a missing/invalid token leaves the request unauthenticated
  rather than throwing, so `SecurityConfig`'s route rules are still what
  actually reject it. `AuthenticationManager` is backed by
  `UserDetailsServiceImpl` (loads a `User` by email) plus the existing
  `PasswordEncoder` bean — Spring Boot auto-configures the
  `DaoAuthenticationProvider` from those two, so login never compares
  passwords by hand.
- Verified with a real `mvn test` run (see `AuthControllerTest`) exercising
  the actual register → login → protected-route flow against the H2 test
  profile, not just reviewed by eye.
