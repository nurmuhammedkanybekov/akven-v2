# API reference

Everything the backend exposes. A live, browsable version of the same thing is served by the
running backend at `/swagger-ui/index.html` (raw spec at `/v3/api-docs`), generated from the code, so it cannot drift.

Errors always use one format, RFC 7807 problem details (`{"title", "status", "detail"}`), with the status codes below.

| Status | Meaning |
|---|---|
| 400 | The request is well formed but breaks a rule (for example an offer that has expired), or a field is invalid |
| 401 | No valid login token |
| 402 | Payment declined |
| 403 | Signed in, but the role is not allowed |
| 404 | Not found, or not visible to this person (another customer's order is a 404) |
| 409 | Conflict: not enough stock, name already taken, or a stale edit |
| 429 | Too many attempts (login lockout, or too many chat messages) |
| 502 | The payment service failed |

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /actuator/health` | Liveness check |
| `POST /api/auth/register` | Customer self-registration |
| `POST /api/auth/login` | Issues a JWT for an existing account |
| `GET /api/auth/me` | Current authenticated user (requires a bearer token) |
| `GET /api/products` | Catalog: filters (category, section, cut, collection, search, size, color, price, in stock), pagination, sort (newest, name, price) |
| `GET /api/products/facets` | Counts per category / section / cut for the current filters |
| `GET /api/catalog/terms` | The owners' sections and cuts (for menus and filters) |
| `GET /api/products/{slug}` | Product detail with variants and images |
| `POST /api/cart/quote` | Today's prices and availability for a cart (public; negotiated prices only for their owner) |
| `POST /api/negotiate` | Chat message `{variantSku, message, quantity?}` → validated offer `{sessionId, reply, validatedDiscountPct, offerPrice}` (signed in; 20 messages per 10 minutes, then 429). Pass `sessionId` as `negotiationSessionId` in the bag |
| `GET /api/admin/negotiations`, `GET /api/admin/negotiations/{id}` | Proposed against validated discount and the transcript (STAFF / ADMIN) |
| `POST /api/orders` | Checkout (signed in; `Idempotency-Key` header required; 402 declined, 409 not enough stock) |
| `GET /api/orders`, `GET /api/orders/{id}`, `POST /api/orders/{id}/cancel` | The customer's own orders |
| `/api/admin/**` | Catalog management: products, variants, sections and cuts, photo upload, retire and restore (STAFF / ADMIN; variant creation and margin floor ADMIN only), audit trail (ADMIN) |
| `/swagger-ui/index.html` | Live, browsable API docs (springdoc-openapi — every `@RestController` shows up automatically) |
| `/v3/api-docs` | Raw OpenAPI spec |
