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
| `GET /api/products/{slug}` | Product detail with variants and images. Each variant has `stockStatus` (`IN_STOCK`, `FEW_LEFT`, `COMING_SOON`, `SOLD_OUT`), `restockInDays` while coming soon, and `casePairs` |
| `POST /api/cart/quote` | Today's prices and availability for a cart (public; negotiated prices only for their owner). Also returns `collection`: total pairs, the minimum that applies, the reached tier, the next tier (`pairsToGo`), and a message when the cart is below the minimum |
| `GET /api/pricing` | Public: the minimum order in pairs and the price ladder `[{minPairs, discountPct}]` |
| `GET`, `PUT /api/admin/pricing/policy` | Minimum order, trusted minimum, and paid orders after which a customer counts as trusted (ADMIN) |
| `GET`, `POST /api/admin/pricing/tiers`, `PUT`, `DELETE /api/admin/pricing/tiers/{id}` | The price ladder; one step per number of pairs, 0 to 90% (ADMIN) |
| `PUT /api/admin/customers/{id}/trusted` | Mark a customer as trusted `{trusted}` (ADMIN) |
| `GET /api/sizes?lang=en\|ru\|ky` | Public size chart: every row has foot length, Korean mm, local (RU / KG), EU and US sizes; `columns` says which lead for the language (EU and US for English, local sizes for Russian and Kyrgyz) |
| `GET /api/sizes/find?system=FOOT_CM\|KR_MM\|LOCAL\|EU&size=…` | Public: the sock size(s) for a shoe size; two at a boundary |
| `POST /api/admin/sizes`, `PUT`, `DELETE /api/admin/sizes/{id}` | Edit the size chart (ADMIN) |
| `GET /api/shop/info` | Public: active contacts (with links built by the server) and pickup points (market, section, passage, container, hours) |
| `GET`, `POST /api/admin/shop/contacts`, `PUT`, `DELETE /api/admin/shop/contacts/{id}` | Instagram, Telegram, WhatsApp, phone and email; each value is checked against its kind (ADMIN) |
| `GET`, `POST /api/admin/shop/pickup-points`, `PUT /api/admin/shop/pickup-points/{id}` | Where orders are collected (ADMIN) |
| `PUT /api/admin/variants/{id}/supply` | `{casePairs, incomingQty, restockEta}`: what is on the way and when; no past dates (STAFF / ADMIN) |
| `POST /api/admin/orders/handover` | At the stall: `{code, phoneEnd}` hands over a paid pickup order; a wrong code and a wrong phone give the same 404 (STAFF / ADMIN) |
| `POST /api/negotiate` | Chat message `{variantSku, message, quantity?}` → validated offer `{sessionId, reply, validatedDiscountPct, offerPrice, outcome}`, where `outcome` (`AS_OFFERED`, `LIMITED_BY_SHOP`, `LIST_PRICE`) says why (signed in; 20 messages per 10 minutes, then 429). Pass `sessionId` as `negotiationSessionId` in the bag |
| `GET /api/admin/negotiations`, `GET /api/admin/negotiations/{id}` | Proposed against validated discount and the transcript (STAFF / ADMIN) |
| `GET /api/admin/negotiations/stats?days=30` | Dashboard: offers per day, how often the shop's limit stepped in, average discount, offers that became paid orders, best-selling items, lines by discount source (STAFF / ADMIN) |
| `GET /api/admin/negotiations/evaluation` | Rule-based against AI assistant on 16 simulated customers, both through the PolicyValidator: discount given, would-buy rate, limit interventions, and final prices above the limit (always zero). The AI answers are scripted and labelled as such (STAFF / ADMIN) |
| `POST /api/orders` | Checkout (signed in; `Idempotency-Key` header required; 402 declined, 409 not enough stock). A paid pickup order gets a six-digit `pickup.code`, shown only to the customer. Deliveries take `fulfillment.country` (`KG`, `KZ`, `UZ`, `RU`; `KG` when left out) |
| `GET /api/orders`, `GET /api/orders/{id}`, `POST /api/orders/{id}/cancel` | The customer's own orders |
| `/api/admin/**` | Catalog management: products, variants, sections and cuts, photo upload, retire and restore (STAFF / ADMIN; variant creation and margin floor ADMIN only), audit trail (ADMIN) |
| `/swagger-ui/index.html` | Live, browsable API docs (springdoc-openapi — every `@RestController` shows up automatically) |
| `/v3/api-docs` | Raw OpenAPI spec |
