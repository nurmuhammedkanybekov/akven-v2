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
- **Seed data (`db/seed/`, `demo` profile only)** gives the catalog realistic
  products, variants and placeholder images for local development and defense
  screenshots; demo passwords are hashed in-migration with pgcrypto's
  `crypt(..., gen_salt('bf'))` rather than committed as plaintext anywhere.
  The seed files keep their original version numbers (V2, V4, V6) and content,
  so their Flyway checksums are unchanged; a non-demo profile simply never loads
  them and therefore never creates the demo accounts.

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
- [x] Catalog API: `GET /api/products` (filters: category, section, cut, collection, search,
      size, color, price range, in-stock; pagination; whitelisted sort), `GET /api/products/{slug}`;
      customer responses are explicit DTOs that never contain `costPrice` or `marginFloorPct`.
      Admin API under `/api/admin/**`: create / edit / retire products (soft delete), variant
      price and stock edits for STAFF and ADMIN, variant creation and `costPrice` /
      `marginFloorPct` changes for ADMIN only (FR-11, enforced with `@PreAuthorize` on the
      service), optimistic-version check on edits, every mutation written to `audit_log_entry`
      in the same transaction (FR-13), ADMIN-only audit trail endpoints. Taxonomy added in
      `V3` (category, cut, occasion) and reworked in `V7`: sections and cuts became admin-managed rows
      (`catalog_term`) so the owners can add their own; audience (Men / Women / Kids / Bundles) stays fixed.
      Extra demo catalog in `V4`.
      Errors use RFC 7807 problem details. Verified on H2 and on real PostgreSQL 16 +
      pgvector (Flyway, Hibernate schema validation, seeded bcrypt login).
- [x] Owner-managed catalog (`V7`): sections and cuts created, renamed, hidden, reordered and deleted
      from the admin API (a term still used by products cannot be deleted, only hidden); products carry
      quality, care and origin; variants carry a colour swatch (`#RRGGBB`); "delete" is a soft delete
      with Restore; photos are uploaded from the admin (JPEG, PNG, WebP, 5 MB; type decided by the file's
      content, random stored names, SVG refused) and served from `/media/uploads/`; the product list has
      search and a retired filter; slugs are generated from the name when omitted.
- [x] Catalog extras: product images (`V5`: ordered, alt text, https or `/media/` URLs only),
      filter counts (`/api/products/facets`), sort by price, batch-loaded admin list.
- [x] Hardening: login lockout (5 failures per client address and account, then `429` with
      `Retry-After`), startup refusal of the built-in JWT secret outside the `demo` profile,
      security headers (CSP on `/api/**`, no-referrer, permissions policy), explicit CORS
      origins without credentials, a correlation id on every request that shows up in logs
      and in audit entries, demo seed data moved behind the `demo` Spring profile
      (`db/seed/`), a JaCoCo coverage gate (80% lines, currently above 90%), and
      `PostgresIntegrationTest` in CI for everything H2 cannot prove.
- [x] Cart & checkout, simulated Apple Pay / Google Pay tokenization, inventory holds
- [x] Negotiation endpoint with a rule-based stand-in behind the same contract the real
      LLM will use in Milestone 3 — `PolicyValidator` already proven correct either way
- [x] Ak&Ven design system (`docs/brand.md`): logo rebuilt from the shop sign as clean vector,
      tokens for a light and a dark theme with an automated WCAG contrast test, accessible
      components (buttons, fields, chips, product card, the negotiation offer that shows
      proposed versus validated price), a living style guide, generated product illustrations,
      new PWA icons and a service worker with explicit offline strategies. React + TypeScript +
      Vite in `frontend/`, built and tested in CI on GitHub and GitLab.
- [x] Shop pages and owner admin on top of it: home, catalog (audience tabs, the owners' sections and
      cuts as filter chips with live counts, stock, sort, everything in the URL), product page (photo
      gallery, colour swatches, sizes, packs, stock wording), login; admin with a role guard, product list
      with search and a removed filter, one add/edit screen (details, colours and sizes, photos, remove and
      restore, history), sections and cuts manager. Client-side routing (React Router 7), a small typed API
      client that turns the backend's problem-detail errors into form messages, the login token kept in
      `sessionStorage` and handed to the API layer synchronously (an effect-based hand-over lost the token on
      page reload; regression test in `src/test/auth.test.tsx`).
- [x] Verified in a real browser against the real stack (`npm run e2e`, also in CI): sign-in, refused wrong
      password, add a section, add a product with two colours, suggested codes that collide get a number,
      photo upload (and refusal of a disguised file), shop filter count, swatches, remove and restore, refused
      deletion of a section that products use, sign-out.
- [x] Cart, checkout and orders (Phase C). Client-side bag (localStorage, validated on read, cross-tab,
      offline); public price quote; `POST /api/orders` with server-side pricing (`PricingService`), row locks on the
      variants in SKU order (the last pair goes to one buyer, opposite-order carts cannot deadlock), an idempotency
      key backed by a unique index, `PaymentProvider` interface with a simulated wallet (token shape whitelist, card
      numbers refused, decline and outage paths that cancel the order and release the stock and are committed),
      order status machine in the entity (PENDING to PAID to FULFILLED; cancel from PENDING or PAID with refund and
      restock), receipt snapshot on each line, database CHECKs (PAID needs a payment reference, delivery needs an
      address, an offer is used once), audit on every state change, admin orders (fulfil, cancel). Verified by
      concurrency tests on H2 and over real HTTP on PostgreSQL, and by the browser journey in `npm run e2e`.
      Not built on purpose: real payment provider, async payment confirmation and expiry of abandoned PENDING
      orders (the simulated provider answers synchronously), shipping costs and taxes.
- [x] Negotiation (Phase D). `POST /api/negotiate`: `NegotiationService` builds a `NegotiationContext` (product, price,
      quantity, message; no cost price or margin floor by construction), asks the `Negotiator` (rule-based stand-in,
      deliberately willing to over-promise), clamps with `PolicyValidator`, stores proposed and validated on a
      `NegotiationSession` (DB CHECK validated <= proposed) and answers with a reply template filled with the
      validated numbers. Customers never receive the proposal unless `akven.demo.expose-proposal` is on. A sliding
      window limits each customer to 20 messages per 10 minutes (429). STAFF and ADMIN read transcripts at
      `/api/admin/negotiations`. Offers feed checkout through `negotiationSessionId`, where they are re-checked
      and clamped again. The Milestone 3 LLM replaces only `Negotiator`.
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
  customer-facing responses are explicit DTOs without them (asserted by
  tests); `costPrice` / `marginFloorPct` writes and variant creation are
  restricted to `ADMIN` with `@PreAuthorize` on the service (FR-11), so the
  rule holds for any caller, not just one URL.
- Secrets (`JWT_SECRET`, `LLM_API_KEY`, payment merchant IDs) are read from
  environment variables only (`application.yml`) — never committed. The
  in-repo default for `JWT_SECRET` is dev-only and is accepted only by the
  `demo` profile; any other profile refuses to start without a real random
  secret, so a forgotten variable fails loudly instead of running insecurely.
- **A bug only a real server exposed:** on Tomcat a `403` is re-dispatched
  internally to `/error`; with `/error` protected, that second dispatch (which
  carries no token) rewrote every `403` to `401`. MockMvc never performs that
  dispatch, so the H2 tests passed. `/error` is now public (it renders only a
  generic status body) and `RealServerSecurityTest` /
  `PostgresIntegrationTest` assert 401-versus-403 on a real embedded server.
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
