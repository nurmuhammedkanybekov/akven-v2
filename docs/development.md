# Running, configuring and testing Ak&Ven

## The quickest way: Docker

```bash
docker compose up --build        # then open http://localhost:8081
```

This starts PostgreSQL (with the pgvector extension), the backend and the shop behind one address, in demo mode. Photos
uploaded in the admin are kept in a Docker volume. To start from nothing, `docker compose down -v` removes the volumes.
CI builds and smoke-tests this setup on every push, so it is known to start.

Demo accounts (demo profile only): `admin@akven.test` / `changeme-admin` (ADMIN) and `staff@akven.test` / `changeme-staff`
(STAFF). Customers register themselves in the shop.

## Running the parts separately

You need PostgreSQL 16 or newer with the `pgvector` extension available.

```bash
# backend, http://localhost:8080
cd backend
export DB_URL=jdbc:postgresql://localhost:5432/akven DB_USER=akven DB_PASSWORD=akven
mvn spring-boot:run

# shop and admin, http://localhost:5173 (forwards /api and uploaded photos to the backend)
cd frontend
npm install
npm run dev
```

### Profiles

`demo` is active by default. It loads the demo accounts, a demo catalog and placeholder images (the files in
`db/seed/`) on top of the real migrations in `db/migration/`. Anything shared or real must run with
`SPRING_PROFILES_ACTIVE=prod`: no seed data, and the application refuses to start unless `JWT_SECRET` is a real random
value (`export JWT_SECRET=$(openssl rand -base64 48)`).

### Settings (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | local Postgres | Database connection |
| `JWT_SECRET` | dev-only value, demo profile only | Signing key for login tokens |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Exact origins allowed to call the API. If the site is served through a proxy that rewrites the `Host` header (Vite's dev proxy does), list the site's own origin here |
| `MEDIA_DIR` | `./data/media` | Where uploaded product photos are stored. Back this folder up |
| `AUTH_MAX_FAILED_LOGINS`, `AUTH_LOCKOUT_MINUTES` | 5, 15 | Login lockout |
| `NEGOTIATION_PROVIDER` | `rule` | `rule` for the built-in assistant, `llm` for a language model |
| `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` | Gemini defaults | Any OpenAI-compatible API (for a free local model use Ollama: `LLM_BASE_URL=http://localhost:11434/v1`, no key) |
| `AKVEN_DEMO_EXPOSE_PROPOSAL` | `false` | When `true`, the chat also shows the assistant's raw proposal next to the validated discount (for demonstrations) |

Copy `.env.example` to `.env` for local values; git ignores `.env`, and secrets are never committed.

## Tests

| What | Command | Notes |
|---|---|---|
| Backend, in-memory database | `cd backend && mvn verify` | About 165 tests against H2 (no Postgres needed), plus a coverage check that fails the build below 80% line coverage. Report: `backend/target/site/jacoco/index.html` |
| Backend, real PostgreSQL | `AKVEN_PG_URL=jdbc:postgresql://localhost:5432/akven_it mvn test -Dtest=PostgresIntegrationTest` | Needs an **empty** database. Checks Flyway, schema validation, database constraints, and the last-pair and double-click races over real HTTP |
| Frontend | `cd frontend && npx tsc --noEmit && npm test && npm run build` | Type check, about 110 component and logic tests (including contrast and translation checks), production build |
| Whole system in a browser | `cd frontend && npm run e2e` | Needs the backend running on a fresh demo database. Walks the owner's, the staff's and the customer's journeys in a real browser, switches the site to Russian and Kyrgyz, and runs accessibility rules on every public page and owner screen |

Current backend line coverage is about 97% overall, and about 97% on the entity classes (the model layer).

## Continuous integration

`.gitlab-ci.yml` runs the backend verify (with coverage reported) and the frontend checks on GitLab.
`.github/workflows/ci.yml` runs the same plus a Postgres smoke test, the Postgres integration tests, the browser test
and the Docker start-up check; it exists so changes can be proven before they reach GitLab.

## Database

Flyway runs the migrations in `backend/src/main/resources/db/migration`; the demo data lives apart in `db/seed`
(including the example price ladder, the stall and the example size chart) and is only loaded by the demo profile. Never edit a migration that has been applied; add a new one. The data model up to V10 is drawn in [`diagrams/04b-er-core.svg`](diagrams/04b-er-core.svg) (core) and
[`diagrams/04-er-data-model.svg`](diagrams/04-er-data-model.svg) (full schema).

The diagrams do not yet show the tables added for Milestone 3 (`shop_policy`, `price_tier`, `shop_contact`,
`pickup_point`, `size_chart_row`) or the new columns on `variant`, `customer_order` and `order_item`.
