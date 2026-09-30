# Milestone 2 plan (Prototype 1, due 20 Oct 2026)

Working branch: `nurmss`. Status: Phase A (auth) done. Everything below is still to do.

## Catalog taxonomy (decided)

Modelled on how the best sock stores (Bombas, Stance, Happy Socks, Uniqlo) organise products:
audience is the top navigation, everything else is a filter.

| Level | Field | Values |
|---|---|---|
| Top navigation | `category` | MEN, WOMEN, KIDS, BUNDLES |
| Filter: cut | `cut` | CREW, ANKLE, NO_SHOW, KNEE_HIGH |
| Filter: occasion | `occasion` | EVERYDAY, SPORT, THERMAL, DRESS |
| Filter: other | existing columns | size, color, pack size, fabric, in stock, price range |
| Merchandising | `collection` (existing) | named product lines |

Bundles have a category but no cut or occasion. Schema change goes in a new `V3` migration with CHECK constraints
and a back-fill of the seed products. API: `GET /api/products?category=MEN&occasion=SPORT&cut=CREW&inStock=true&page=0`.

## Phases

| Phase | Scope | Done when |
|---|---|---|
| B | Catalog API: public list/detail, admin CRUD, soft delete, audit log, V3 taxonomy, richer seed data | DTO test proves `costPrice`/`marginFloorPct` never leak; STAFF gets 403 on margin floor; tests green on H2 and Postgres |
| C | Orders: server-side price recompute, stock reservation, simulated Apple/Google Pay provider, order history, cancel | Race test on the last unit passes; order is PAID only after a confirmed token |
| D | Negotiation: `Negotiator` interface, rule-based stand-in, `PolicyValidator` clamp, persisted proposed vs validated, admin transcript view | Over-asking message yields validated == floor; DB CHECK holds |
| E | React + Vite frontend built from `docs/design-direction.html` | `npm run build` passes; main flow clicked through; screenshots captured |
| F | Docs, JaCoCo coverage, CI green on GitHub and GitLab | Both pipelines green; README and architecture status tables current |

## Quality bar (what "best of the best" means here)

- **Security:** JWT + RBAC with correct 401/403, bcrypt, no secrets in the repo, rate limit on login and negotiate, input validation on every DTO, security headers, explicit CORS origins, audit log on every price/policy change.
- **Data:** Flyway only, never edit V1/V2, optimistic locking, soft delete, indexes on filter columns, Hibernate `validate` checked on real Postgres.
- **Architecture:** thin controllers, service layer, explicit response DTOs, one error format (RFC 7807 problem details), OpenAPI kept accurate.
- **Testing:** unit + full-flow MockMvc tests, Testcontainers Postgres for the critical paths, JaCoCo with a coverage gate (goal above 80% on the model layer).
- **UI:** real design tokens from the locked direction, three breakpoints, accessible (keyboard, contrast, labels), fast (image sizes, lazy loading), installable PWA with offline cart.
- **Brand and content:** realistic product names, descriptions, fabric details and photography placeholders for the Ak&Ven house label; negotiate chat with a bazaar tone.

## Open questions

- Final list of cuts and occasions (above is a proposal).
- Does the customer ever see the proposed discount? Default: no, only the validated value; a demo flag shows both.
- LLM API key needed before Milestone 3.
