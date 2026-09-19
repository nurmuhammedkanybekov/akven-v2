# Ak&Ven

Bachelor's thesis, ELTE IK, Autumn 2026 — Nurmuhammed, supervised by Prof. Walid Guettala.

Ak&Ven sells Korean-made socks — a special agreement with a Korean fabric and
manufacturing partner produces them under the Ak&Ven house label, currently
sold at Dordoi Bazaar in Bishkek, Kyrgyzstan. This project builds a custom
e-commerce platform for the brand, centered on an AI sales agent that
negotiates price and bundles the way bazaar customers actually expect,
instead of a static storefront.

## What's here (Milestone 1 — due 25 Sept)

- [`docs/architecture.md`](docs/architecture.md) and
  [`docs/architecture-diagram.svg`](docs/architecture-diagram.svg) — system
  design: the 3-layer architecture, data model, and the Policy Validator
  mechanism that keeps the negotiator's discounts safe.
- [`backend/`](backend) — Spring Boot 3.3 / Java 17 skeleton: module
  structure (catalog, orders, negotiation, audit, users), JPA entities,
  Flyway schema + seed-data migrations, a real RBAC shape in
  `SecurityConfig`, health check, one context-load test.
- [`frontend/`](frontend) — PWA shell: real manifest + branded icons (so it
  actually installs), and a service worker that caches the shell itself for
  offline reopen. Still a placeholder for the real catalog/cart UI, which is
  Phase 1 work — see the TODO in `frontend/public/sw.js` for what Phase 1
  adds on top of this.
- Use-case diagram — done. Wireframes for the 5 key screens — in progress,
  see `docs/architecture.md`'s status list.

## Running the backend locally

Requires a PostgreSQL 16+ instance with the `pgvector` extension available
(`CREATE EXTENSION vector;` — see `db/migration/V1__init_schema.sql`).

```
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
profile before there's a shared/production database — noted as a TODO in
`docs/architecture.md`.

`GET /actuator/health` confirms it's up, and `/swagger-ui/index.html` gives a
live, browsable API doc (every `@RestController` shows up automatically via
springdoc-openapi — no separate doc to keep in sync). `mvn test` runs the smoke test
against an in-memory H2 database, no Postgres required (Flyway is disabled
for that profile since pgvector/pgcrypto are Postgres-only — see
`src/test/resources/application.yml`).

## Roadmap

See the phased build plan (Milestones 1–4, final submission 1 Dec) in the
thesis planning documents shared with the supervisor.
