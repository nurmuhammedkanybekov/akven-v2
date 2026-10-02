# Milestone 2 plan (Prototype 1, due 20 Oct 2026)

Working branch: `nurmss`. Status: phases A to D done (auth, catalog, orders, negotiation). Frontend is built; docs and CI polish remain.

## Catalog structure (decided, revised in V7)

Modelled on how the best sock stores (Bombas, Stance, Happy Socks, Uniqlo) organise products: audience is the top
navigation, everything else is a filter. The owners wanted to add their own sections, so sections and cuts are
data they manage in the admin, not fixed lists.

| Level | Field | Values |
|---|---|---|
| Top navigation (fixed) | `category` | MEN, WOMEN, KIDS, BUNDLES |
| Owner-managed | `section` | Classic, Casual, Sport, Thermal to start; the owners add more (for example "Premium Gold Line") |
| Owner-managed | `cut` | No-show, Ankle, Crew, Mid-long, Knee-high to start; the owners add more |
| Filter: other | existing columns | size, colour, pack size, fabric, in stock, price range |
| Merchandising | `collection` (free text) | named product lines |

Bundles have a category but no section or cut. API: `GET /api/products?category=MEN&section=sport&cut=crew&inStock=true&page=0`.

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

- Final starting list of sections and cuts (the owners can change them any time in the admin).
- Does the customer ever see the proposed discount? Default: no, only the validated value; a demo flag shows both.
- LLM API key needed before Milestone 3.
