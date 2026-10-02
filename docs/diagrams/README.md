# Thesis figures

Every figure is drawn on a 1100 px canvas with no text below 20 px. At the
~16 cm text width of the thesis that is about 8 pt, so the labels stay
readable in print. Each figure is available as SVG (source of truth), PNG
(2x, for slides) and PDF (vector, for LaTeX/Word).

The two ER figures follow a different rule. Figure 4b is the one that goes in
the body of the thesis: every label is 34 px on a 1100 px canvas, which is
14 pt at 16 cm width, and it uses a full portrait page (about 24 cm tall).
Figure 4 is the complete schema for the appendix, meant for a landscape A4
page; with ten tables and every column on one page, column names print at
about 6.5 pt there.

| # | File | Shows | Suggested caption |
|---|---|---|---|
| 1 | `01-architecture-overview` | Three layers, one API, one database, plus the two external systems | System architecture of Ak&Ven |
| 2 | `02-negotiation-validation-path` | Trust boundary: untrusted model proposal vs. trusted Policy Validator | The Policy Validator as the trust boundary for every discount |
| 3 | `03-sequence-negotiation-turn` | UML sequence diagram of one negotiation turn | Sequence of one negotiation turn (proposed 25 %, validated 15 %) |
| 4 | `04-er-data-model` | Appendix: all ten tables after migrations V1–V10, every column with type, PK/FK/UQ and NOT NULL, enum values and CHECK constraints, crow's-foot relationships | Full entity-relationship diagram of the Ak&Ven schema (migrations V1–V10) |
| 4b | `04b-er-core` | Body: the seven core tables with their keys and 3–4 key columns each | Core data model: users, catalog, orders and negotiation sessions |
| 5a | `05a-use-cases-customer` | Customer use cases, AI Negotiation Agent and Payment Provider as system actors | Use cases: customer side |
| 5b | `05b-use-cases-staff-admin` | Staff/Admin use cases, Admin-inherits-Staff generalization | Use cases: staff and admin side |

Figures 1 and 2 split what used to be one crowded architecture diagram:
Figure 1 is the overview, Figure 2 zooms into the one mechanism that matters.
Figures 3 and 4 are new diagram types (sequence, ER). The use-case diagram is
split into 5a/5b so each half can be read at print size.

## Reading the ER figures

Tables are grouped into four coloured bands: Identity, Catalog and Orders in
gold, and AI / Negotiation in lilac. Relationships use crow's-foot notation
(‖ exactly one, o| zero or one, o< zero or many). A solid line is a real
foreign key; the dashed lilac line from `negotiation_session` to `order_item`
is a logical link (`order_item.negotiation_session_id` is UNIQUE but has no
foreign key); the dashed grey table and line for `product_embedding` mark the
RAG index that is only used from Milestone 3.

Two markers carry the security argument of the thesis. Badge 1 marks
`variant.cost_price` and `variant.margin_floor_pct`, which are never sent to
the AI or to the customer. Badge 2 marks `proposed_discount_pct` and
`validated_discount_pct` on `negotiation_session`, where a database CHECK
guarantees validated ≤ proposed. In Figure 4 the S badge marks the receipt
snapshot columns on `order_item`, copied at checkout so an order stays
correct after the catalog changes.

The legacy column `customer_order.negotiation_session_id` (no foreign key) is
left out of both figures; the per-line `order_item.negotiation_session_id`
replaced it.
