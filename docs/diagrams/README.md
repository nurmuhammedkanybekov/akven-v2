# Thesis figures

Every figure is drawn on a 1100 px canvas with no text below 20 px. At the
~16 cm text width of the thesis that is about 8 pt, so the labels stay
readable in print. Each figure is available as SVG (source of truth), PNG
(2x, for slides) and PDF (vector, for LaTeX/Word).

| # | File | Shows | Suggested caption |
|---|---|---|---|
| 1 | `01-architecture-overview` | Three layers, one API, one database, plus the two external systems | System architecture of Ak&Ven |
| 2 | `02-negotiation-validation-path` | Trust boundary: untrusted model proposal vs. trusted Policy Validator | The Policy Validator as the trust boundary for every discount |
| 3 | `03-sequence-negotiation-turn` | UML sequence diagram of one negotiation turn | Sequence of one negotiation turn (proposed 25 %, validated 15 %) |
| 4 | `04-er-data-model` | The eight PostgreSQL tables and their relationships | Entity-relationship diagram of the data model |
| 5a | `05a-use-cases-customer` | Customer use cases, AI Negotiation Agent and Payment Provider as system actors | Use cases: customer side |
| 5b | `05b-use-cases-staff-admin` | Staff/Admin use cases, Admin-inherits-Staff generalization | Use cases: staff and admin side |

Figures 1 and 2 split what used to be one crowded architecture diagram:
Figure 1 is the overview, Figure 2 zooms into the one mechanism that matters.
Figures 3 and 4 are new diagram types (sequence, ER). The use-case diagram is
split into 5a/5b so each half can be read at print size.
