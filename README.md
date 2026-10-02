# Ak&Ven

**Bachelor's thesis · ELTE IK · Autumn 2026**
Nurmuhammed Kanybekov, supervised by Prof. Walid Guettala

[![pipeline status](https://szofttech.inf.elte.hu/gnn/thesis-bachelor-2026-2027-01/nurmuhammed/badges/master/pipeline.svg)](https://szofttech.inf.elte.hu/gnn/thesis-bachelor-2026-2027-01/nurmuhammed/-/commits/master)

Ak&Ven is my parents' brand of Korean-made socks, sold at Dordoi Bazaar in Bishkek, Kyrgyzstan. At the bazaar nobody
pays the label price: customers bargain, and a good seller reads the situation and makes an offer. This project is an
online shop for the brand that keeps that habit instead of replacing it with a fixed price tag. An assistant
negotiates with the customer, and a small, deterministic piece of code makes sure it can never give away more than the
owners allow.

## The idea in one paragraph

A language model is good at conversation and not safe to trust with money. So the assistant only **proposes** a
discount. A plain `PolicyValidator` clamps every proposal to the margin floor stored for that product before anything
is shown, saved or charged. The assistant is never even told the floor or the cost price. Both numbers, what it
proposed and what was allowed, are kept for every conversation, so the shop team can read exactly what happened. The
guarantee does not depend on how well the model behaves: a model that is tricked, confused or simply wrong cannot
change what the customer pays.

## What exists today

- **Shop:** catalog with filters, product pages, a bag that works offline, checkout with a simulated Apple Pay and
  Google Pay wallet, order history and cancellation.
- **Negotiation chat** on every product page, with a rule-based assistant by default and an optional language-model
  assistant.
- **Admin for the owners:** add and remove products, sections, cuts, colours, sizes and photos, handle orders, read
  negotiation transcripts. No developer is needed for day-to-day changes.
- **Safety:** server-side pricing, stock that cannot be oversold, a checkout that cannot charge twice, login lockout,
  role-based access, an audit log of every change.
- **Quality:** about 140 backend tests with 97% line coverage (the build fails below 80%), about 90 frontend tests,
  tests on real PostgreSQL, and a browser test of the full journey that also runs accessibility rules.

What is not built, on purpose: a real payment provider (the wallet is simulated, no money moves), email, shipping and
taxes. See [`docs/progress.md`](docs/progress.md) for the state against each milestone and
[`docs/traceability.md`](docs/traceability.md) for every requirement, its implementation and its test.

## Try it

```bash
docker compose up --build        # then open http://localhost:8081
```

Admin sign-in (demo mode only): `admin@akven.test` / `changeme-admin`. In the shop, open a product, sign up, and ask
the chat for "50% off" to watch the cap work. Running the parts separately, configuration and tests are in
[`docs/development.md`](docs/development.md).

## How it is built

| Layer | Technology |
|---|---|
| Client | React, TypeScript, Vite; one installable PWA for customers and admin, with a service worker |
| API | Spring Boot 3.3, Java 17; JWT with three roles; Flyway migrations; one error format (RFC 7807); OpenAPI docs |
| Data | PostgreSQL 16 with pgvector (embeddings are the next step) |
| Assistant | `Negotiator` interface with two implementations: rule-based, and a language model through any OpenAI-compatible API |
| Delivery | Docker Compose; CI on GitLab and GitHub Actions |

The design, the data model and the safety mechanism are described in [`docs/architecture.md`](docs/architecture.md).

## Repository layout

```
backend/     Spring Boot application, database migrations, tests
frontend/    The shop and admin (React), scripts for icons, screenshots and the browser test
docs/        Everything written down; see below
docker-compose.yml, .gitlab-ci.yml, .github/workflows/ci.yml
```

## Documentation

| Document | What it covers |
|---|---|
| [`docs/requirement-analysis.md`](docs/requirement-analysis.md) | Actors, use cases, functional and non-functional requirements |
| [`docs/traceability.md`](docs/traceability.md) | Each requirement: where it is implemented, which test shows it, what is open |
| [`docs/architecture.md`](docs/architecture.md) | Layers, data model, the Policy Validator and the security notes |
| [`docs/progress.md`](docs/progress.md) | Status against the supervisor's milestones |
| [`docs/user-guide.md`](docs/user-guide.md) | How the owners and the customers use the shop |
| [`docs/development.md`](docs/development.md) | Running, settings, tests, CI, database |
| [`docs/api.md`](docs/api.md) | The API endpoints and error codes |
| [`docs/diagrams/`](docs/diagrams/README.md) | Thesis figures: architecture, validation path, negotiation sequence, data model (core and full), use cases |
| [`docs/wireframes.svg`](docs/wireframes.svg) | Wireframes of the key screens on phone, tablet and laptop |
| [`docs/brand.md`](docs/brand.md) | Logo, colours, type; screenshots in [`docs/design/`](docs/design/) |
