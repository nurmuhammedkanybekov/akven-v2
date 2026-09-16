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
  Flyway schema migration, health check, one context-load test.
- [`frontend/`](frontend) — PWA shell placeholder (manifest + service worker
  registration), to be built out in Phase 1.
- Use-case diagram and wireframes for the 5 key screens — in progress, see
  `docs/architecture.md`'s status list.

## Running the backend locally

Requires a PostgreSQL instance with the `pgvector` extension available.

```
cd backend
export DB_URL=jdbc:postgresql://localhost:5432/akven
export DB_USER=akven
export DB_PASSWORD=akven
mvn spring-boot:run
```

`GET /actuator/health` confirms it's up. `mvn test` runs the smoke test
against an in-memory H2 database, no Postgres required.

## Roadmap

See the phased build plan (Milestones 1–4, final submission 1 Dec) in the
thesis planning documents shared with the supervisor.
