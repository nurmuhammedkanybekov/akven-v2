# Ak&Ven — Requirement Analysis

**Milestone 1 deliverable.** Companion to [`architecture.md`](./architecture.md) and [`architecture-diagram.svg`](./architecture-diagram.svg) — this document defines *what* the system must do; the architecture doc defines *how*. The use-case diagram and wireframes (next Milestone 1 deliverables) are drawn directly from the use cases listed here.

## 1. Purpose and scope

Ak&Ven sells Korean-made socks under its own label, currently through Dordoi Bazaar in Bishkek, where price negotiation is the normal way customers buy. This thesis builds a web platform for the brand centered on an AI sales agent that negotiates price and bundles the way bazaar customers already expect, instead of a static storefront with fixed prices.

This document covers the **AI-first MVP** scope agreed for the thesis semester — the negotiator and the commerce flow it sits inside. It excludes the deferred future-work items listed in §3.2.

## 2. Actors

| Actor | Type | Description |
|---|---|---|
| **Customer** | Human, primary | Browses the catalog, negotiates price with the AI agent, and checks out. No account required to browse; an account is created at checkout. |
| **Staff** | Human, primary | A family-business employee. Manages catalog and stock, reviews orders. Cannot change margin-floor policy. |
| **Admin** | Human, primary | Owner-level access (Nur / family). Everything Staff can do, plus margin-floor policy, user management, and audit log access. |
| **AI Negotiation Agent** | System, secondary | Not a human actor — the LLM+RAG pipeline invoked by the Negotiation use case. Included because its behavior and limits are part of what's being specified, not just how it's implemented. |
| **Payment Provider** | System, secondary | Apple Pay / Google Pay, reached through a `PaymentProvider` interface (see architecture doc). External to the system; returns a tokenized payment confirmation, never raw card data. |

## 3. Use cases

### 3.1 In scope this semester

| ID | Use case | Primary actor(s) | Summary |
|---|---|---|---|
| UC-1 | Browse catalog | Customer | View products and variants (size, color, pack), with live stock and price. |
| UC-2 | Manage cart | Customer | Add/remove/update variants and quantities before checkout. |
| UC-3 | Negotiate price | Customer, AI Negotiation Agent | Customer chats with the agent about a variant; agent proposes a discount or bundle grounded in retrieved product/inventory/policy data; the proposal is validated against the margin floor before it can be applied to the cart. |
| UC-4 | Checkout | Customer, Payment Provider | Customer pays via Apple Pay or Google Pay for the cart at its negotiated prices; an order is created on confirmed payment. |
| UC-5 | Authenticate | Customer, Staff, Admin | Register/log in. Determines role-based access for every other use case. |
| UC-6 | Manage catalog | Staff, Admin | Create/edit/retire products and variants, including price, stock, and (Admin only) margin floor. |
| UC-7 | Review negotiation transcripts | Staff, Admin | View past negotiation sessions, including the AI's proposed discount versus what was actually validated and applied — the evidence trail for margin safety. |
| UC-8 | View audit log | Admin | See a record of every admin/staff mutation (who changed what, before/after). |
| UC-9 | Manage users | Admin | Create staff/admin accounts and assign roles. |

### 3.2 Explicitly out of scope this semester

Full offline order queue with sync, predictive demand forecasting, WhatsApp/Telegram order sync, a second payment rail (MBank/Optima), and an event-driven backend (RabbitMQ) are named future work — see `architecture.md` §"Why this shape." They are not modeled as use cases here so the diagram in the next deliverable stays honest about what's actually being built.

## 4. Functional requirements

Grouped by the module each maps to in the architecture (Catalog & Orders, Negotiation, Audit, Auth).

| ID | Requirement |
|---|---|
| FR-1 | The system shall list all in-stock product variants with their current price, size, color, and pack size (UC-1). |
| FR-2 | The system shall let a customer add a variant and quantity to a cart without requiring an account (UC-2). |
| FR-3 | The system shall accept a natural-language negotiation message from a customer for a specific variant and return an agent response (UC-3). |
| FR-4 | The AI Negotiation Agent shall ground its response in the variant's actual price, stock, and margin-floor data via retrieval — it shall not negotiate from the model's general knowledge alone (UC-3). |
| FR-5 | Every discount or bundle the agent proposes shall be checked by a deterministic Policy Validator against the variant's stored margin floor before it can be applied to a cart; the validator's output, not the agent's raw proposal, is what's ever applied (UC-3). |
| FR-6 | The system shall log both the agent's proposed discount and the validator's actual (clamped) discount for every negotiation session, tied to that session (UC-3, UC-7). |
| FR-7 | The system shall process checkout only through the Apple Pay / Google Pay `PaymentProvider` interface, never accepting or storing raw card data (UC-4). |
| FR-8 | The system shall create an order only after receiving a confirmed payment token from the Payment Provider (UC-4). |
| FR-9 | The system shall require authentication for any Staff or Admin action, and shall enforce that Staff cannot alter margin-floor policy (UC-5, UC-6). |
| FR-10 | The system shall let Staff/Admin create, edit, and retire products and variants, including stock and price (UC-6). |
| FR-11 | The system shall restrict editing of a variant's `marginFloorPct` to Admin accounts only (UC-6). |
| FR-12 | The system shall let Staff/Admin view a list of negotiation sessions with both the proposed and validated discount for each (UC-7). |
| FR-13 | The system shall record an audit log entry (actor, action, entity, before/after state) for every catalog, price, or policy mutation (UC-6, UC-8). |
| FR-14 | The system shall let Admin view the audit log and create Staff/Admin accounts (UC-8, UC-9). |

## 5. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Security | Passwords are never stored or logged in plaintext (hashed, e.g. bcrypt/Argon2). |
| NFR-2 | Security | Every API endpoint enforces role-based access control (`CUSTOMER` / `STAFF` / `ADMIN`); there is one API, not a separate "admin backend." |
| NFR-3 | Security | The negotiation endpoint treats customer input as untrusted — no discount reaches an order without passing the Policy Validator, regardless of what the customer's message says. |
| NFR-4 | Security | No raw payment card data is ever received, stored, or logged by the system. |
| NFR-5 | Reliability | A customer can browse the catalog and hold cart changes while offline (service worker cache); actions sync once connectivity returns. |
| NFR-6 | Performance | A negotiation response is returned within a time the customer perceives as conversational (target: under ~5s for the RAG + LLM round trip, to be measured once Phase 2 is built). |
| NFR-7 | Maintainability | Every admin-facing mutation is auditable after the fact via the audit log (FR-13), without needing to inspect application logs. |
| NFR-8 | Testability | The Policy Validator and negotiation-policy logic are unit-testable independent of the LLM call, since they are the component the Milestone 3 coverage bar (>80% on the model layer) applies to. |
| NFR-9 | Portability | The frontend is a single installable PWA serving both customer and admin roles through gated routes, not two separate applications. |
| NFR-10 | Operability | The backend builds and tests automatically in CI on every push (GitLab CI), per `.gitlab-ci.yml`. |
| NFR-11 | Usability / Portability | The customer-facing storefront (UC-1–UC-4) is responsive across three breakpoints — phone, tablet, and laptop/desktop — and behaves equivalently whether accessed as a mobile-browser tab or as the installed PWA in standalone display mode (same layout and functionality; only the browser chrome vs. OS status-bar framing differs). The admin/staff panel (UC-6–UC-9) is optimized primarily for laptop/desktop use, with a supported tablet layout for on-the-floor checks at Dordoi Bazaar; a dedicated phone-optimized admin layout is out of scope this semester — admin routes remain reachable on a phone through the shared responsive PWA, just without a bespoke small-screen design pass. |

## 6. Constraints

- **Technology:** Java 17 / Spring Boot 3.3 backend, PostgreSQL with the `pgvector` extension, a single PWA frontend — see `architecture.md`.
- **Timeline:** ELTE IK milestone schedule (Milestone 1: 25 Sept; Milestone 3 — ~100% complete, CI/CD, >80% model-layer coverage: 10 Nov; final submission: 1 Dec).
- **Business:** No formal agreement exists with a Kyrgyz FinTech provider (MBank/Optima); checkout uses Apple Pay / Google Pay instead, which requires no such agreement (see decision log in the project brief).
- **Evaluation:** All graded work must be present in the GitLab repository; nothing outside it is evaluated.

## 7. Assumptions and open dependencies

- Access to an LLM API (provider not yet finalized) with acceptable cost and latency for a conversational negotiation flow.
- Availability of real or representative product/pricing data from the family business for the catalog and for grounding the RAG pipeline — flagged as an open question for Walid (see the thesis plan artifact).
- An Apple Developer / Google Pay merchant account can be set up in time for Phase 2 integration work.
- The evaluation method for the negotiator (user study vs. simulated benchmark vs. margin-safety test suite) is still to be confirmed with Walid — NFR-6's latency target and NFR-8's coverage scope may be refined once that's settled.

## 8. Status

- [x] Actors and use cases identified
- [x] Functional and non-functional requirements drafted
- [x] Multi-device scope clarified (NFR-11: phone web + installed PWA, tablet, laptop for the storefront; laptop-primary + tablet for admin)
- [ ] Reviewed with Prof. Guettala
- [x] Use-case diagram (drawn directly from §3.1 — verified against this document, no gaps found)
- [ ] Wireframes for the 5 key screens across the full breakpoint matrix (catalog, product/cart, checkout, negotiation chat — phone browser + installed PWA, tablet, laptop; admin dashboard — laptop + tablet)
