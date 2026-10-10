# Ak&Ven

**Bachelor's thesis · ELTE IK · Autumn 2026**
Nurmuhammed Kanybekov, supervised by Prof. Walid Guettala

[![pipeline status](https://szofttech.inf.elte.hu/gnn/thesis-bachelor-2026-2027-01/nurmuhammed/badges/master/pipeline.svg)](https://szofttech.inf.elte.hu/gnn/thesis-bachelor-2026-2027-01/nurmuhammed/-/commits/master)

Ak&Ven is my family's brand of Korean-made socks, sold from container 70-E at Dordoi Bazaar in Bishkek, Kyrgyzstan.
At the bazaar nobody pays the label price: customers bargain, buy for the whole family, and shops buy by the case.
This project is the brand's online shop. It keeps those habits instead of replacing them with a fixed price tag:
customers build collections from any socks, the price per pair drops as the collection grows, and an assistant
negotiates with them, while a small, deterministic piece of code makes sure no discount ever goes below what the
owners allow.

## The idea in one paragraph

A language model is good at conversation and not safe to trust with money. So the assistant only **proposes** a
discount. A plain `PolicyValidator` clamps every proposal to the limit stored for that sock before anything is shown,
saved or charged, and the same check applies to the collection discount at checkout. The assistant is never told the
limit or the cost price. What it proposed and what was allowed are both kept for every conversation, and every order
line records which rule set its price. The guarantee does not depend on how well the model behaves: a model that is
tricked, confused or simply wrong cannot change what the customer pays.

## What the shop does

**For customers**

- A storefront in **English, Russian and Kyrgyz**, light and dark, on phone, tablet and laptop.
- A home page built around the real stall, **container 70-E**: its doors open on a rail of swaying socks, a fitting
  shows each sock height on a leg, a box shows the collection price as socks drop in, a bazaar calculator tells how
  "ask for your price" works, a gift calendar counts down to the holidays, and a drawn route leads to the stall.
- About 40 demo products: business and argyle, five-toe, compression, brushed home socks with grip, children's
  character socks, the oimo ornament line, and gift boxes for 23 February, 8 March, Nooruz, New Year and school.
- **Collections:** mix any socks. The minimum order and the price ladder count pairs across the whole bag, and the
  bag says how many more pairs reach the next step ("add 4 more pairs to save 5%").
- **Honest stock:** in stock, only a few left, arrives in about N days, or sold out.
- **Ask for your price:** a negotiation chat on every product page, with the reason for each price.
- **Size guide** in the sizes each customer knows (EU and US in English, local sizes in Russian and Kyrgyz), with a
  shoe-size finder.
- **Pickup at Dordoi** with a six-digit pickup code, or delivery to Kyrgyzstan, Kazakhstan, Uzbekistan and Russia.
- Checkout with a simulated Apple Pay and Google Pay wallet, order history and cancellation, a bag that works offline.

**For the owners and staff (the admin)**

- Products, sections, cuts, colours, sizes, photos, stock on the way and wholesale case sizes.
- Orders, and a hand-over screen for the stall (pickup code plus the end of the customer's phone number).
- A dashboard: offers per day, how often the limit stepped in, offers that became orders, best sellers.
- A comparison of the rule-based and the AI assistant on the same simulated customers, for the evaluation chapter.
- Owners only: the minimum order, the price ladder, trusted customers, contacts, the stall and the size chart.

**Safety and quality**

- Prices are decided only on the server; stock cannot be oversold; a checkout cannot charge twice.
- Login lockout, three roles (customer, staff, owner), an audit log of every change, and database constraints that
  refuse impossible values even if the application is bypassed.
- About 165 backend tests with 97% line coverage (the build fails below 80%), 10 more on real PostgreSQL, about 115
  frontend tests, and a browser test of the full journey in three languages that also runs accessibility rules.

What is not built, on purpose: a real payment provider (the wallet is simulated, no money moves), email and SMS, and
a live AI model in production. See [`docs/progress.md`](docs/progress.md) for the state against each milestone and
[`docs/traceability.md`](docs/traceability.md) for every requirement, its implementation and its test.

## Try it

You need Docker (on a Mac, Docker Desktop or Colima).

```bash
docker compose up --build
```

Then open **http://localhost:8081**. The admin is at http://localhost:8081/admin.

| Demo account | Email | Password |
|---|---|---|
| Owner | `admin@akven.test` | `changeme-admin` |
| Staff | `staff@akven.test` | `changeme-staff` |

These accounts exist only in demo mode. Things to try: switch the language in the top bar; open a product and ask
the chat for "50% off" to watch the limit work; put 20 pairs of mixed socks in the bag to see the collection price;
pay for a pickup order to get a pickup code, then hand it over in the admin.

To start again from a clean database: `docker compose down -v` and then `docker compose up --build`.

Running the backend and frontend separately, the settings and all the tests are in
[`docs/development.md`](docs/development.md). How to check that a laptop has the latest version and how to publish to
GitLab is in [`docs/git-workflow.md`](docs/git-workflow.md).

## How it is built

| Layer | Technology |
|---|---|
| Client | React 18, TypeScript, Vite; one installable PWA for customers and admin; English, Russian and Kyrgyz |
| API | Spring Boot 3.3, Java 17; JWT with three roles; Flyway migrations; one error format (RFC 7807); OpenAPI docs at `/swagger-ui/index.html` |
| Data | PostgreSQL 16 with pgvector |
| Assistant | `Negotiator` interface with two implementations: rule-based, and a language model through any OpenAI-compatible API |
| Delivery | Docker Compose; CI on GitLab and GitHub Actions |

The design, the data model and the safety mechanism are described in [`docs/architecture.md`](docs/architecture.md).

## Repository layout

```
backend/     Spring Boot application, database migrations (db/migration) and demo data (db/seed), tests
frontend/    The shop and the admin (React), translations (src/i18n), scripts for icons, screenshots and the browser test
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
| [`docs/user-guide.md`](docs/user-guide.md) | How the owners, the staff and the customers use the shop |
| [`docs/development.md`](docs/development.md) | Running, settings, tests, CI, database |
| [`docs/git-workflow.md`](docs/git-workflow.md) | Branches, checking a laptop is up to date, publishing to GitLab |
| [`docs/api.md`](docs/api.md) | The API endpoints and error codes |
| [`docs/diagrams/`](docs/diagrams/README.md) | Thesis figures: architecture, validation path, negotiation sequence, data model, use cases |
| [`docs/wireframes.svg`](docs/wireframes.svg) | Wireframes of the key screens on phone, tablet and laptop |
| [`docs/brand.md`](docs/brand.md) | Logo, colours, type, ornaments; screenshots in [`docs/design/`](docs/design/) |
