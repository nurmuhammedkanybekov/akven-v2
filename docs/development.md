# Running, configuring and testing AK&VEN

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
export SPRING_PROFILES_ACTIVE=demo   # demo catalog, demo accounts and the simulated wallet; leave out for a safe start
mvn spring-boot:run

# shop and admin, http://localhost:5173 (forwards /api and uploaded photos to the backend)
cd frontend
npm install
npm run dev
```

### Profiles

Started **without a profile**, the shop is safe by default: no demo catalog, every `@akven.test` demo account
switched off, and no payment provider, so checkout refuses to take a payment ("Online payment is not set up in this
shop yet"). **Demo mode is chosen explicitly** with `SPRING_PROFILES_ACTIVE=demo` (Docker Compose does it for you): it
loads the demo accounts, a demo catalog and placeholder images (the files in `db/seed/`) on top of the real migrations
in `db/migration/`, switches the demo accounts back on, and turns on the **simulated wallet**, which moves no money and
says so in the shop. Login tokens are signed with `JWT_SECRET` when it is set, otherwise with a random key the
installation makes on its first start and keeps in its database; a key written in the repository is never used.

### Settings (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | local Postgres | Database connection |
| `JWT_SECRET` | none: the installation makes its own random key | Signing key for login tokens (at least 32 bytes when set) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Exact origins allowed to call the API. If the site is served through a proxy that rewrites the `Host` header (Vite's dev proxy does), list the site's own origin here |
| `MEDIA_DIR` | `./data/media` | Where uploaded product photos are stored. Back this folder up |
| `AUTH_MAX_FAILED_LOGINS`, `AUTH_LOCKOUT_MINUTES` | 5, 15 | Login lockout, per visitor address and account |
| `AUTH_MAX_REGISTRATIONS_PER_HOUR` | 30 | New accounts one visitor address may create in an hour (generous: many shoppers share one mobile network address) |
| `AKVEN_BIND` | `127.0.0.1` | Docker only: which network address the shop listens on. `0.0.0.0` opens it to other computers (for a phone on the same Wi-Fi; never on a public server, where Caddy serves it, see deployment.md) |
| `NEGOTIATION_PROVIDER` | `rule` | `rule` for the built-in assistant, `llm` for a language model. Only the starting choice: the super admin can switch it in Admin > AI assistant without a restart |
| `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` | Gemini defaults | Any OpenAI-compatible API (for a free local model use Ollama: `LLM_BASE_URL=http://localhost:11434/v1`, no key) |
| `SHOP_CONTACTS` | empty | The real contacts, `KIND\|label\|value` separated by `;`, in display order. Applied on start whenever the list changes; phone numbers live here and in the database, never in the repository |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME` | empty | Create the super admin on the first start of a real installation (password at least 12 characters). An existing account is never changed |
| `DEMO_ACCOUNTS` | `off` | Outside demo mode, and in demo mode once a super admin is set, every `@akven.test` demo account is switched off at start. `on` keeps them |
| `PAYMENT_PROVIDER` | `none` | `none`: no payments are taken. `simulated`: the demo wallet (set by the demo profile; no money moves). A real provider is future work |
| `API_DOCS` | `false` | `true` publishes the API description (`/v3/api-docs`) and Swagger UI outside demo mode. Demo mode always has them |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | empty, 587 | The SMTP server for emails to customers (STARTTLS). Empty host: nothing is sent, every email is kept in Admin > Emails to customers |
| `MAIL_FROM`, `MAIL_FROM_NAME` | `akven.socks@gmail.com`, `AK&VEN` | Who the emails come from; replies go there too |
| `PUBLIC_URL` | `http://localhost:8081` | The shop's own address, for the order links in emails |
| `MAIL_KEEP_DAYS` | 90 | Emails hold names and addresses, so they are deleted after this many days |
| `AKVEN_DEMO_EXPOSE_PROPOSAL` | `false` | When `true`, the chat also shows the assistant's raw proposal next to the validated discount (for demonstrations) |

Copy `.env.example` to `.env` for local values; git ignores `.env`, and secrets are never committed.

## Running it for real

The full guide, from renting a server to backups, is [`deployment.md`](deployment.md). In short:

1. In `.env`: `SPRING_PROFILES_ACTIVE=prod` (any value but `demo`; Docker Compose starts in demo mode without it), `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`, `SHOP_CONTACTS`, and change
   `DB_PASSWORD` (a long random value, set before the very first start: the database keeps the password it was
   created with).
2. Put the shop behind HTTPS (for example Caddy or nginx with a Let's Encrypt certificate) that forwards to
   `localhost:8081`, set `AKVEN_BIND=127.0.0.1` (the default, so only the HTTPS proxy reaches it) and
   `CORS_ALLOWED_ORIGINS=https://your-domain`.
3. Back up every day with `sh scripts/backup.sh` (database and photos into `backups/`, which git ignores) and copy the
   files off the server. The script's header shows how to restore.

What protects the installation, in short: passwords are hashed with BCrypt; login tokens are signed with a key that is
unique to the installation and stop working at once when an account is disabled, its role changes or its password is
reset; failed logins and new sign-ups are limited per visitor address (taken from the proxy's `X-Forwarded-For`, which
the backend trusts only from a private-network proxy); every admin change is in the audit log; and the web server
sends a strict Content-Security-Policy (only this site's own scripts, styles, images and API) with `nosniff`,
`frame-ancestors 'none'` and a referrer policy (`frontend/security-headers.conf`).

## Tests

| What | Command | Notes |
|---|---|---|
| Backend, in-memory database | `cd backend && mvn verify` | 284 tests against H2 (no Postgres needed; the 11 PostgreSQL ones are skipped there), plus a coverage check that fails the build below 80% line coverage. Report: `backend/target/site/jacoco/index.html` |
| Backend, real PostgreSQL | `AKVEN_PG_URL=jdbc:postgresql://localhost:5432/akven_it mvn test -Dtest=PostgresIntegrationTest` | Needs an **empty** database. Checks Flyway, schema validation, database constraints, and the last-pair and double-click races over real HTTP |
| Frontend | `cd frontend && npx tsc --noEmit && npm test && npm run build` | Type check, about 135 component and logic tests (including contrast and translation checks), production build |
| Whole system in a browser | `cd frontend && npm run e2e` | Needs the backend running on a fresh demo database. Walks the owner's, the staff's and the customer's journeys in a real browser, switches the site to Russian and Kyrgyz, and runs accessibility rules on every public page and owner screen |

Current backend line coverage is 96.1% overall (JaCoCo, measured on 10 November 2026).

## Continuous integration

`.gitlab-ci.yml` runs the backend verify (with coverage reported) and the frontend checks on GitLab.
`.github/workflows/ci.yml` runs the same plus a Postgres smoke test, the Postgres integration tests, the browser test
and the Docker start-up check; it exists so changes can be proven before they reach GitLab.

## Database

Flyway runs the migrations in `backend/src/main/resources/db/migration`; the demo data lives apart in `db/seed`
(including the example price ladder, the stall and the example size chart) and is only loaded by the demo profile. Never edit a migration that has been applied; add a new one. The data model up to V10 is drawn in [`diagrams/04b-er-core.svg`](diagrams/04b-er-core.svg) (core) and
[`diagrams/04-er-data-model.svg`](diagrams/04-er-data-model.svg) (full schema).

The diagrams do not yet show the tables added for Milestone 3 (`shop_policy`, `price_tier`, `shop_contact`,
`pickup_point`, `size_chart_row`, `delivery_zone`) or the new columns on `variant`, `customer_order` and `order_item`
(V35 adds `kind`, `pay_on_receipt` and `note` to a delivery area, and the same kind and pay-on-receipt to the order's copy).
