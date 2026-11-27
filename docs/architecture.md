# AK&VEN — Architecture

Diagrams: [system overview](./diagrams/01-architecture-overview.svg),
[the validation path](./diagrams/02-negotiation-validation-path.svg),
[one negotiation turn](./diagrams/03-sequence-negotiation-turn.svg),
[core tables](./diagrams/04b-er-core.svg) and [the full schema](./diagrams/04-er-data-model.svg).

## Why this shape

AK&VEN is one brand with one stall and a catalogue of a few thousand product variants, built and run by one
developer. The architecture is sized for that: one service, one database, one web application. It borrows patterns
from open-source shop platforms (Shopizer for the Spring and JWT structure; Medusa and Saleor for treating the
administration as just another client of one API), but not their multi-shop, plugin-driven scale. A message broker,
a separate vector store or microservices would add running costs without a benefit at this size.

## The three layers

1. **Client** — one installable PWA (React, TypeScript). The shop and the administration are the same application
   with routes for each role, not two programs.
2. **API** — one Spring Boot service (`backend/`) that holds every business rule: catalogue, pricing, negotiation,
   orders and payment, stock, delivery, accounts and the audit log. JWT authentication with four roles
   (`CUSTOMER`, `STAFF`, `ADMIN` for the owners, `SUPER_ADMIN`). The browser never decides a price.
3. **Data** — PostgreSQL 16 with the `pgvector` extension, in one database rather than a separate vector store. The
   schema is created and changed only by versioned Flyway migrations; Hibernate only validates it.

## The mechanism that matters: the PolicyValidator

The assistant never sets a price. It proposes a discount as data, and `PolicyValidator`
(`backend/src/main/java/com/akven/thesis/negotiation/PolicyValidator.java`) is the only code that turns that proposal
into something an order can use. It limits the proposal to the variant's `marginFloorPct`, which is the largest
discount in percent that the owners allow for that variant (the name is historical; the validator never reads the cost
price). The check is deterministic, independent of the model and unaffected by prompt injection: whatever a customer
talks the model into saying, only what the validator allows gets through. Checkout runs the same check again.

Every negotiation turn stores both values, the proposal and the allowed discount, so the owners can see for each
conversation what the assistant wanted and what the shop allowed.

## Data model

| Entity | Purpose |
|---|---|
| `Product` / `Variant` | A sock style and its sellable options (size, colour, pack size), with price, stock, reserved stock, cost price and limit per variant |
| `Order` / `OrderItem` | What was sold; each line keeps a snapshot of the name, picture and price paid, and the rule that set the price |
| `StockMovement` | The stock ledger: every change of a variant's stock with its reason |
| `NegotiationSession` | One conversation about one item: the latest proposed and allowed discount, and when the offer was made (it is valid for 24 hours) |
| `NegotiationTurn` | Every message and answer, with the assistant that answered (`llm`, `rules`, `rules-fallback`), the language and both numbers |
| `User` | All four roles in one table, with role-gated access |
| `AppSetting` | Small runtime settings the super admin can change without a restart (for example which assistant answers); never secrets |
| `AuditLogEntry` | One row per change made by the team, with the values before and after |

## Rules enforced by the database

Several rules are enforced by PostgreSQL as well as by the code, so that a bug in the service layer cannot write an
impossible row:

- **Optimistic locking.** A `version` column on accounts, products, variants and orders turns a lost-update race into
  an error instead of a silent overwrite. Admin edits must send the version they were based on.
- **Stock that cannot go wrong.** `available_qty` is a generated column (`stock_qty - reserved_qty`), and
  `CHECK (stock_qty >= reserved_qty)` keeps stock from falling below what is reserved.
- **An allowed discount never exceeds its proposal.** `CHECK (validated_discount_pct <= proposed_discount_pct)` on
  negotiation sessions and turns. This is a second check around the validator, not a replacement for it.
- **Paid orders have a payment reference**, delivery orders an address, and a reserved order its deadline.
- **Soft delete for products**, so past orders stay intact. Foreign keys default to `ON DELETE RESTRICT`.
- **Case-insensitive unique emails** through a functional index on `lower(email)`.
- **The stock ledger** (`stock_movement`) is only ever added to, in the same transaction as the change, and keeps the
  stock right after each row, so a variant's rows add up to its stock (`StockLedgerTest`). Sales and cancellations
  must name their order.
- **Reservations** (`RESERVED` orders) hold stock in `reserved_qty` until `reserved_until`. A scheduled job ends those
  that were not collected. Pickup codes are unique among open orders.
- **Reviews** are one per customer and product; whether a customer may review is read from their handed-over orders.
- **Family profiles and gift boxes** have their values checked by the database as well as by the API.
- **`product_embedding`** has an `ivfflat` index and a chunk number per variant, ready for vector search later
  without a breaking migration.

Demo data lives in `db/seed/` and is loaded only in demo mode. Demo passwords are hashed in the migration with
pgcrypto's `crypt(..., gen_salt('bf'))` and are never stored as plain text. All migrations and constraints are tested
against a real PostgreSQL 16 with pgvector (`PostgresIntegrationTest`).

## Security

- **Passwords** are stored as BCrypt hashes and limited to the 72 characters BCrypt reads. Five failed sign-ins for one
  account from one address lock that pair for fifteen minutes.
- **Tokens.** Each installation signs its tokens with its own random 384-bit key, created on first start when
  `JWT_SECRET` is not set. A secret that is set must be at least 32 bytes.
- **Sessions end when the account says so.** The role is read from the database on every request, and a token is
  refused once its account is disabled or its password was reset.
- **Roles.** `SUPER_ADMIN > ADMIN` is a Spring role hierarchy, so owner rules admit the super admin without being
  repeated. URL rules make the catalogue, the price quote, the shop information, wholesale requests and checkout public,
  restrict `/api/admin/**` to the team, and require sign-in for everything else; method security
  (`@PreAuthorize`) adds the finer rules, for example that staff cannot change prices or limits.
- **Customers see only their own data.** The account is always taken from the token, never from the request.
- **Secrets stay out of the repository.** The model's key, the real phone numbers and the first super admin come from
  environment variables (`.env`). The key is never stored, shown or logged; the admin only sees whether it is set.
  Cost prices and limits never appear in customer responses, which use separate DTOs (checked by tests).
- **Untrusted input.** Every request body is validated. Free text is stored as plain text and rendered by React as
  text. The orders spreadsheet is protected against CSV injection. Pictures are accepted by their content, and SVG
  files are refused. The `next` parameter after sign-in accepts only a path inside the site.
- **Rate limits** on sign-ups, chat messages, guest checkouts and wholesale requests, with bounded memory. The visitor's
  address is taken from `X-Forwarded-For` only behind the local proxy.
- **Headers.** The web server sends a strict Content-Security-Policy, `nosniff`, `frame-ancestors 'none'` and a
  referrer policy, checked by the Docker smoke test in CI.
- **Demo accounts** are switched off as soon as a real super admin is configured, and the API documentation is public
  only in demo mode.
- **Real-server behaviour is tested.** On Tomcat a `403` is re-dispatched to `/error`; with `/error` protected, that
  second dispatch turned every `403` into a `401`. MockMvc never does that dispatch, so `RealServerSecurityTest` and
  `PostgresIntegrationTest` check 401 versus 403 on a real server.

## Known limitations

- **Payment runs inside the checkout transaction.** With the simulated wallet the charge is instant. A real payment
  provider would need the payment moved outside the transaction (reserve stock, pay, confirm, with a timeout that
  releases the reservation), because a slow provider would otherwise hold the stock locks.
- **Vector search is prepared but not used.** The assistant is grounded by the product facts and shop policy passed in
  each request, chosen by keywords.
- **Rate limits are kept in memory**, which is right for one backend; several backends would share them through the
  database.
- **Only the bag works offline.** Product pages are not cached, and placing an order needs a connection.
