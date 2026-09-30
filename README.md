# Ak&Ven

**Bachelor's thesis · ELTE IK · Autumn 2026**
Nurmuhammed — supervised by Prof. Walid Guettala

[![pipeline status](https://szofttech.inf.elte.hu/gnn/thesis-bachelor-2026-2027-01/nurmuhammed/badges/master/pipeline.svg)](https://szofttech.inf.elte.hu/gnn/thesis-bachelor-2026-2027-01/nurmuhammed/-/commits/master)

Ak&Ven sells Korean-made socks — a special agreement with a Korean fabric and
manufacturing partner produces them under the Ak&Ven house label, currently
sold at Dordoi Bazaar in Bishkek, Kyrgyzstan. This thesis builds a custom
e-commerce platform for the brand, centered on an AI sales agent that
negotiates price and bundles the way bazaar customers actually expect,
instead of a static storefront.

## Contents

- [Documentation](#documentation)
- [Architecture at a glance](#architecture-at-a-glance)
- [Repository layout](#repository-layout)
- [Running the backend locally](#running-the-backend-locally)
- [Milestone 1 status](#milestone-1-status-due-25-sept)
- [Milestone 2 progress](#milestone-2-progress-due-20-oct)
- [Roadmap](#roadmap)

## Documentation

| Document | What it covers |
|---|---|
| [`docs/requirement-analysis.md`](docs/requirement-analysis.md) | Actors, functional requirements (FR), non-functional requirements (NFR) |
| [`docs/diagrams/05a-use-cases-customer.svg`](docs/diagrams/05a-use-cases-customer.svg) | UML use cases, customer side — «include»/«extend», AI agent and payment provider as system actors |
| [`docs/diagrams/05b-use-cases-staff-admin.svg`](docs/diagrams/05b-use-cases-staff-admin.svg) | UML use cases, staff and admin side — Admin inherits Staff |
| [`docs/wireframes.svg`](docs/wireframes.svg) | Wireframes for all 5 key screens across phone (browser + installed PWA), tablet, and laptop |
| [`docs/architecture.md`](docs/architecture.md) | System design: the 3-layer architecture, data model, and the Policy Validator mechanism |
| [`docs/diagrams/`](docs/diagrams/README.md) | Thesis figures (large print-size text): architecture overview, Policy Validator trust boundary, negotiation sequence diagram, ER diagram |
| [`docs/brand.md`](docs/brand.md) | Brand and design system: logo, colour, type, how to regenerate assets; screenshots in [`docs/design/`](docs/design/) |

## Architecture at a glance

One Spring Boot API — JWT + RBAC (`CUSTOMER` / `STAFF` / `ADMIN`) — serves
both the customer storefront and the admin panel as the same code path, not
two separate systems.

1. **Client layer** — a single installable PWA; customer and admin views are
   role-gated routes of the same app.
2. **API + negotiation layer** — Catalog & Orders, Negotiation (rule-based
   stand-in in Milestone 2, real LLM + RAG in Milestone 3), Audit Log.
3. **Data / ML layer** — PostgreSQL with the `pgvector` extension for
   product/policy embeddings.

The mechanism that matters: the negotiator never sets a price. It proposes a
discount as data; `PolicyValidator` is the only code allowed to turn that
proposal into something that can touch an order, clamping it to the
variant's stored margin floor — deterministic and immune to prompt
injection by construction, whether the proposal comes from the Milestone 2
rule-based stand-in or the real LLM later. Full write-up in
[`docs/architecture.md`](docs/architecture.md).

## Repository layout

```
.
├── backend/            Spring Boot 3.3 / Java 17 — catalog, orders, negotiation, audit, users, auth
│   ├── src/main/java/com/akven/thesis/
│   └── src/main/resources/db/migration/   Flyway schema + seed data
├── frontend/           React + TypeScript + Vite PWA: design system and style guide (shop pages follow), manifest, icons, service worker
├── docs/               Requirement analysis, use-case diagram, wireframes, architecture, design direction
└── .gitlab-ci.yml      Maven test stage, JUnit report, dependency cache
```

## Running the backend locally

Requires a PostgreSQL 16+ instance with the `pgvector` extension available
(`CREATE EXTENSION vector;` — see `db/migration/V1__init_schema.sql`).

```bash
cd backend
export DB_URL=jdbc:postgresql://localhost:5432/akven
export DB_USER=akven
export DB_PASSWORD=akven
mvn spring-boot:run          # default profile = demo: demo accounts + demo catalog, dev JWT secret allowed
```

**Profiles.** `demo` is active by default and loads `db/seed/` (demo accounts
`admin@akven.test` / `staff@akven.test`, a demo catalog and placeholder images)
on top of the real migrations in `db/migration/`. Anything shared or real must
run with `SPRING_PROFILES_ACTIVE=prod`: no seed data, and the app refuses to
start unless `JWT_SECRET` is a real random value
(`export JWT_SECRET=$(openssl rand -base64 48)`). Other settings:
`CORS_ALLOWED_ORIGINS` (default `http://localhost:5173`) and
`AUTH_MAX_FAILED_LOGINS` / `AUTH_LOCKOUT_MINUTES` (default 5 / 15).

| Endpoint | Purpose |
|---|---|
| `GET /actuator/health` | Liveness check |
| `POST /api/auth/register` | Customer self-registration |
| `POST /api/auth/login` | Issues a JWT for an existing account |
| `GET /api/auth/me` | Current authenticated user (requires a bearer token) |
| `GET /api/products` | Catalog: filters (category, section, cut, collection, search, size, color, price, in stock), pagination, sort (newest, name, price) |
| `GET /api/products/facets` | Counts per category / section / cut for the current filters |
| `GET /api/catalog/terms` | The owners' sections and cuts (for menus and filters) |
| `GET /api/products/{slug}` | Product detail with variants and images |
| `POST /api/cart/quote` | Today's prices and availability for a cart (public; negotiated prices only for their owner) |
| `POST /api/orders` | Checkout (signed in; `Idempotency-Key` header required; 402 declined, 409 not enough stock) |
| `GET /api/orders`, `GET /api/orders/{id}`, `POST /api/orders/{id}/cancel` | The customer's own orders |
| `/api/admin/**` | Catalog management: products, variants, sections and cuts, photo upload, retire and restore (STAFF / ADMIN; variant creation and margin floor ADMIN only), audit trail (ADMIN) |
| `/swagger-ui/index.html` | Live, browsable API docs (springdoc-openapi — every `@RestController` shows up automatically) |
| `/v3/api-docs` | Raw OpenAPI spec |

`mvn test` runs the test suite against an in-memory H2 database, no
Postgres required (Flyway is disabled for that profile since
pgvector/pgcrypto are Postgres-only — see `src/test/resources/application.yml`).
The tests exercise real flows end to end (register → login → protected route,
catalog filters, admin rules, audit log). `mvn verify` additionally enforces a
JaCoCo gate of 80% line coverage (report in `target/site/jacoco/index.html`).

`PostgresIntegrationTest` runs on real PostgreSQL: Flyway, Hibernate schema
validation, role rules on a real server, database CHECK constraints. It is
skipped unless a database is given; point it at an **empty** one:

```bash
createdb akven_it
AKVEN_PG_URL=jdbc:postgresql://localhost:5432/akven_it mvn test -Dtest=PostgresIntegrationTest
```

CI runs it on every push (`backend-postgres-it`).

## Running the shop and the admin

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, forwards /api and uploaded photos to the backend on :8080
```

Sign in at `/login`. Demo accounts (demo profile only): `admin@akven.test` / `changeme-admin` (ADMIN) and
`staff@akven.test` / `changeme-staff` (STAFF). Staff are sent to the admin at `/admin`.

**What the owners can do in the admin, without a developer**

| Task | Where |
|---|---|
| Add, rename, hide, reorder or delete a **section** (Classic, Sport, "Premium Gold Line"...) or a **cut** (Crew, Mid-long...) | Sections and cuts, or "+ Add a new section" right inside the product form |
| Add a product: name, who it is for, section, cut, quality, fabric, care, origin | Products, Add a product |
| Add each **colour and size** with a swatch, price, stock, cost and the biggest discount the assistant may give | Product form, or later on the product's page |
| Upload **photos** whenever they exist (JPEG, PNG, WebP, up to 5 MB, 8 per product; first is the cover) | The product's page, Photos |
| **Remove** a product from the shop (instantly, reversible) and **put it back** | The product's page; nothing is ever hard-deleted, so past orders stay intact |
| See who changed what (admins) | The product's page, History |

**How a customer buys**

1. **Bag:** "Add to bag" on any product. The bag lives in the browser (no account needed, survives a reload, works
   offline, shared between tabs). It remembers *which item and how many*; prices are always asked from the server.
2. **Checkout:** signing in (or creating an account) is needed here. The customer gives a name and phone, chooses pick-up
   or delivery, and pays with **Apple Pay or Google Pay**. In this project the wallet is a **simulated** sheet: it returns
   a one-time token, never a card number, and no money moves. A switch in the sheet makes the "bank" decline, to show a
   failed payment. Real merchant integration is out of scope; the code sits behind a `PaymentProvider` interface.
3. **Order:** confirmation page, then history under "Your orders". A customer can cancel while it is paid and not yet
   completed: the payment is refunded and the socks go back on the shelf.
4. **Shop team:** Admin, Orders, "To fulfil": open an order, **Mark as completed**, or cancel and refund.

**Safety rules built into checkout:** the server decides every price (a negotiated price applies only if it is that
customer's, for that item, recent, unused, and never below the margin floor); the last pair can only be sold once
(rows are locked while stock is checked); pressing pay twice cannot pay twice (idempotency key); an order is only
"paid" with a payment reference from a confirmed token; a declined payment releases the stock; every change is in the
audit log.

Staff can do everything except create colours and sizes or change cost and discount limit (those are admin-only,
because they drive the pricing guardrail). Until a product has photos the shop shows a branded placeholder.

Uploaded photos are stored under `MEDIA_DIR` (default `backend/data/media`); back that folder up. If the site is
served through a proxy that rewrites the `Host` header (Vite's dev proxy does), list the site's own origin in
`CORS_ALLOWED_ORIGINS` or the backend will refuse its requests.

Checks that drive a real browser: `npm run e2e` (needs the backend running on a fresh demo database and
`CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173`; it adds a section and a product, uploads a photo,
finds it in the shop, removes and restores it) and `npm run screenshots`. CI runs the end-to-end check on every push.

## Milestone 1 status (due 25 Sept)

| Deliverable | Status |
|---|---|
| Requirement analysis | Done |
| Use-case diagram | Done |
| Wireframes (5 key screens, full device matrix) | Done |
| Architecture design + diagram | Done |
| Backend skeleton (entities, migrations, RBAC, CI) | Done |
| Frontend PWA shell | Done |
| Live API docs (springdoc-openapi) | Done |

## Milestone 2 progress (due 20 Oct)

Target: Prototype 1 — core backend + basic UI integrated, ~30–50% functional.

| Deliverable | Status |
|---|---|
| Real authentication (register / login / me, JWT filter, Spring Security wiring) | Done |
| Full catalog API: public list with filters and pagination, product detail with variants, Men / Women / Kids / Bundles plus owner-managed sections and cuts, admin management with audit log and ADMIN-only margin floor | Done |
| Cart & checkout, simulated payment tokenization, inventory holds | Not started |
| Negotiation endpoint (rule-based stand-in behind the real API contract) | Not started |
| Ak&Ven design system: logo rebuilt from the shop sign, tokens (light and dark, WCAG-checked), components, living style guide | Done |
| Shop pages: home, catalog with live filters and counts, product page with colour swatches and sizes, login | Done |
| Admin: products, colours and sizes, photo upload, sections and cuts, remove and restore, history | Done |
| Cart (works offline), checkout with simulated Apple Pay / Google Pay, order history, cancel with refund; admin orders (fulfil, cancel) | Done |
| Negotiation endpoint and chat (rule-based stand-in behind the real contract) | Not started |
| `requirement-analysis.md` / use-case diagram updated for the locked-in design direction | Not started |

## Roadmap

See the phased build plan (Milestones 1–4, final submission 1 Dec) in the
thesis planning documents shared with the supervisor.

---

**Author:** Nurmuhammed — ELTE IK, 7th semester — supervised by Prof. Walid Guettala.
