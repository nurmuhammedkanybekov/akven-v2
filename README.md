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
- [Roadmap](#roadmap)

## Documentation

| Document | What it covers |
|---|---|
| [`docs/requirement-analysis.md`](docs/requirement-analysis.md) | Actors, functional requirements (FR), non-functional requirements (NFR) |
| [`docs/use-case-diagram.svg`](docs/use-case-diagram.svg) | Full UML use-case diagram — «include»/«extend» dependencies, Admin/Staff generalization |
| [`docs/wireframes.svg`](docs/wireframes.svg) | Wireframes for all 5 key screens across phone (browser + installed PWA), tablet, and laptop |
| [`docs/architecture.md`](docs/architecture.md) | System design: the 3-layer architecture, data model, and the Policy Validator mechanism |
| [`docs/architecture-diagram.svg`](docs/architecture-diagram.svg) | Architecture diagram — layered swimlanes, external system actors, request/data flow |

## Architecture at a glance

One Spring Boot API — JWT + RBAC (`CUSTOMER` / `STAFF` / `ADMIN`) — serves
both the customer storefront and the admin panel as the same code path, not
two separate systems.

1. **Client layer** — a single installable PWA; customer and admin views are
   role-gated routes of the same app.
2. **API + negotiation layer** — Catalog & Orders, Negotiation (LLM + RAG,
   Phase 2), Audit Log.
3. **Data / ML layer** — PostgreSQL with the `pgvector` extension for
   product/policy embeddings.

The mechanism that matters: the LLM never sets a price. It proposes a
discount as data; `PolicyValidator` is the only code allowed to turn that
proposal into something that can touch an order, clamping it to the
variant's stored margin floor — deterministic and immune to prompt
injection by construction. Full write-up in
[`docs/architecture.md`](docs/architecture.md).

## Repository layout

```
.
├── backend/            Spring Boot 3.3 / Java 17 — catalog, orders, negotiation, audit, users
│   ├── src/main/java/com/akven/thesis/
│   └── src/main/resources/db/migration/   Flyway schema + seed data
├── frontend/           PWA shell — manifest, icons, service worker
├── docs/               Requirement analysis, use-case diagram, wireframes, architecture
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
mvn spring-boot:run
```

Flyway runs `V1__init_schema.sql` then `V2__seed_demo_data.sql`
automatically on startup, so the catalog isn't empty on first run (two demo
accounts too — `admin@akven.test` / `staff@akven.test`, see that file for
the seed passwords). `V2` is demo-only and should move behind a Spring
profile before there's a shared/production database.

| Endpoint | Purpose |
|---|---|
| `GET /actuator/health` | Liveness check |
| `/swagger-ui/index.html` | Live, browsable API docs (springdoc-openapi — every `@RestController` shows up automatically) |
| `/v3/api-docs` | Raw OpenAPI spec |

`mvn test` runs the smoke test against an in-memory H2 database, no
Postgres required (Flyway is disabled for that profile since
pgvector/pgcrypto are Postgres-only — see `src/test/resources/application.yml`).

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
| Real negotiation pipeline, auth, checkout | Phase 1–2 |

## Roadmap

See the phased build plan (Milestones 1–4, final submission 1 Dec) in the
thesis planning documents shared with the supervisor.

---

**Author:** Nurmuhammed — ELTE IK, 7th semester — supervised by Prof. Walid Guettala.
