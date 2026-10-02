# Requirements traceability

For every requirement in [`requirement-analysis.md`](requirement-analysis.md): what implements it, which automated test
shows it works, and whether it is done. Written against the code as it is now; where the code differs from what the
requirement says, that is stated rather than hidden.

Status: **Done**, **Partial** (works, with a stated gap) or **Open**.

## Functional requirements

| ID | Status | Implemented in | Shown by |
|---|---|---|---|
| FR-1 list in-stock variants with price, size, colour, pack | Done | `catalog/CatalogService`, `GET /api/products` | `CatalogControllerTest`; shop UI (`pages/Catalog`, `pages/Product`) |
| FR-2 cart without an account | Done | Browser bag (`cart/CartContext`), public `POST /api/cart/quote` | `cart` frontend tests, `OrderControllerTest` (quote) |
| FR-3 negotiation message in, agent reply out | Done | `negotiation/NegotiationController`, `NegotiationService` | `NegotiationControllerTest`, `PostgresIntegrationTest`, browser test |
| FR-4 reply grounded in retrieved data | **Partial** | `ProductKnowledge` picks catalog facts (fabric, care, origin, pack, size); price and quantity are in the prompt | `ProductKnowledgeTest`, `LlmNegotiatorTest`. Two gaps: retrieval is keyword-based and the planned vector search (`product_embedding`) is not wired yet; and the requirement lists the margin floor among the grounding data, but the design deliberately keeps it **away** from the model and applies it afterwards (see FR-5). The requirement text should be amended to say so |
| FR-5 every discount checked by a deterministic validator | Done | `negotiation/PolicyValidator`, called by `NegotiationService` and again by `order/PricingService` | `PolicyValidatorTest`, `NegotiationControllerTest`, `UntrustedAssistantTest` (an assistant offering 80% is capped), `OrderControllerTest` (a tampered offer is re-clamped at checkout) |
| FR-6 log proposed and validated discount per session | Done | `NegotiationSession`; database CHECK validated <= proposed | `NegotiationControllerTest`, `PostgresIntegrationTest` (the database refuses a bad row by itself) |
| FR-7 checkout only through the wallet interface, no card data | Done | `payment/PaymentProvider`, `SimulatedWalletProvider` | `PaymentServiceTest` (card numbers refused) |
| FR-8 order only after a confirmed payment token | Done | `order/OrderService`; database CHECK paid-needs-reference | `OrderControllerTest`, `PostgresIntegrationTest` |
| FR-9 authentication for staff/admin; staff cannot change margin policy | Done | `config/SecurityConfig`, `@PreAuthorize` on services | `RealServerSecurityTest`, `AdminCatalogControllerTest`, `HttpHardeningTest` |
| FR-10 create, edit and retire products and variants | Done | `catalog/AdminCatalogService`, admin screens | `AdminCatalogControllerTest`, browser test (add, remove, restore) |
| FR-11 only Admin edits the margin floor | Done | `AdminCatalogService` | `AdminCatalogControllerTest` (staff gets 403) |
| FR-12 list negotiations with proposed and validated | Done | `AdminNegotiationController`, Admin > Negotiations | `NegotiationControllerTest`, browser test |
| FR-13 audit entry for every catalog, price or policy change | Done | `audit/AuditService` (mandatory transaction, request id) | `AdminCatalogControllerTest`, `PostgresIntegrationTest` |
| FR-14 admin views the audit log and creates staff/admin accounts | **Partial** | The audit trail is shown per product and per variant (History). There is **no** screen or endpoint to create staff or admin accounts (UC-9); the demo accounts come from the seed data | Audit: `AdminCatalogControllerTest`. UC-9 is open |

## Non-functional requirements

| ID | Status | Evidence |
|---|---|---|
| NFR-1 passwords hashed | Done | bcrypt (`config/SecurityConfig`); `AuthControllerTest` |
| NFR-2 role-based access on every endpoint | Done | URL rules plus `@PreAuthorize` on services; `RealServerSecurityTest` checks 401 against 403 on a real server |
| NFR-3 customer input untrusted in negotiation | Done | The assistant never sees the floor; replies are filtered and templated; the discount is clamped; offers are re-checked at checkout. Tests above |
| NFR-4 no card data received, stored or logged | Done | Only wallet tokens are accepted (`PaymentServiceTest`) |
| NFR-5 browse and hold the cart offline | **Partial** | The bag works offline (`cart` tests, service worker); product pages are not cached, so the catalog itself is not browsable offline. Orders cannot be placed offline |
| NFR-6 conversational response time | Done | Measured once against the live Gemini model: about 1 second per message; the rule-based assistant is instant. The rate limit is 20 messages per 10 minutes per customer |
| NFR-7 mutations auditable without reading logs | Done | `audit_log_entry` table with before and after state |
| NFR-8 validator testable without the model | Done | `PolicyValidatorTest`; model-layer line coverage about 97% (JaCoCo, gate at 80%) |
| NFR-9 one PWA for customer and admin | Done | One React app, role-gated routes, manifest and service worker |
| NFR-10 automated build and test in CI | **Partial** | `.gitlab-ci.yml` is in place and the same checks run green on GitHub Actions; the first run on the ELTE GitLab is still to be done |
| NFR-11 responsive on phone, tablet, laptop | Done | Layouts built for three breakpoints; screenshots at the three widths in `docs/design/`; the capture script fails on any sideways overflow; accessibility rules run in the browser test |

## Not built, on purpose

A real payment provider (the wallet is simulated), order confirmation by email, shipping costs and taxes, a second
payment rail, an offline order queue, demand forecasting and the WhatsApp/Telegram link. These were already named as
future work in the requirement analysis.
