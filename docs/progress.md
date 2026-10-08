# Progress log

Where the project stands against the supervisor's milestones. Last updated 2 October 2026.

## Milestone 1: requirement analysis, skeleton, design diagrams (due 25 September)

Done and confirmed by the supervisor: requirement analysis, use-case diagrams, wireframes for the key screens,
architecture description and diagrams, backend skeleton with CI. The data-model diagram has since been redrawn for the
current schema (ten tables, migrations V1 to V10) in two versions, a core figure for the body of the thesis and a full
one for the appendix.

## Milestone 2: prototype with core backend and basic UI (due 20 October)

Delivered ahead of the date, and well beyond the 30 to 50 percent asked for.

| Area | What works |
|---|---|
| Accounts | Registration, login with signed tokens, three roles, login lockout after repeated failures |
| Catalog | Public browsing with filters (audience, section, cut, size, colour, price, stock), counts, sorting, product pages with photos; the owners manage sections, cuts, products, colours, sizes and photos themselves in the admin; nothing is hard-deleted |
| Orders | Server-side pricing, stock that cannot be oversold (the last pair is sold once, proven with real concurrency), double-click safe checkout, simulated Apple Pay and Google Pay, order history, cancel with refund, admin order handling |
| Negotiation | Chat on the product page; the assistant's proposal is clamped to the margin floor; the proposal and the validated value are stored for every conversation; admin transcripts; rate limiting |
| Assistant | Deterministic rule-based assistant by default; optional language-model assistant (any OpenAI-compatible API, tried live against Gemini) with catalog facts, filtered replies and automatic fallback to the rules |
| Quality | About 140 backend tests (97% line coverage, gate at 80%), about 90 frontend tests, real-PostgreSQL tests, a browser test of the whole customer and owner journey with accessibility rules |
| Operations | Docker setup that starts everything with one command, CI with six jobs on GitHub, GitLab pipeline file |

## Milestone 3: final program, CI/CD, over 80% model-layer coverage (due 10 November)

| Item | State |
|---|---|
| Test coverage over 80% on the model layer | Met: about 97%, and the build fails below 80% |
| CI/CD running | GitHub Actions green. The same checks are defined for GitLab and need their first run there |
| Real language model with retrieval | Model connected and tested live. Retrieval is keyword-based; vector search over product embeddings (pgvector) is the next step |
| Collection pricing | Done: the order minimum counts pairs across the whole cart (mixing socks is allowed, a pack counts all its pairs), trusted customers have a lower minimum, the price ladder lowers the price per pair, and each order line records which rule set its price. Owners change all of it in the admin API, every change is audited, and the database refuses impossible values |
| Contacts and pickup | Done: owners enter contacts (links built and checked by the server) and the Dordoi stall in the admin API. A paid pickup order gets a six-digit code; staff hand it over only with the code and the end of the contact phone, once |
| Stock status and countries | Done: customers see in stock, only a few left (threshold set by the owners), coming in N days, or sold out. Staff record incoming stock, its arrival date and the case size. Deliveries go to Kyrgyzstan, Kazakhstan, Uzbekistan or Russia |
| Size chart | Done: one chart with foot length, Korean mm, local, EU and US sizes, led by EU and US in English and by local sizes in Russian and Kyrgyz, plus a finder from shoe size to sock size. Demo values still need checking against the packaging |
| Dashboard and comparison | Done: the owners' negotiation dashboard (per day, limits, conversion, best sellers, discount sources), "why this price" on every offer and order line, and a rule-based against AI comparison on 16 simulated customers. The AI side uses scripted answers, labelled in every report, until a recorded live run replaces them |
| New storefront | Done: navy and gold design in Onest, English, Russian and Kyrgyz, a rebuilt home page, visit, size guide and wholesale pages, stock status and collections in the shop, and owner screens for pricing, contacts, sizes, the dashboard and the stall hand-over. The end-to-end check covers the languages and every new screen, including the accessibility rules |
| Remaining gaps | Creating staff and admin accounts from the admin (UC-9), a single audit-log screen, real product photos, the real certificate and story texts, a native speaker's check of the Russian and Kyrgyz texts, a customers screen for marking trusted customers |
| Evaluation of the negotiator | A simulated-customer comparison is built (`/api/admin/negotiations/evaluation`). Still to agree with the supervisor: whether to add a recorded live-model run and a small user study |

## Milestone 4: thesis draft (due 22 November)

Not started. The technical chapters can follow the structure of `architecture.md` and `traceability.md`.

## Known limitations

The payment wallet is simulated and no money moves. There is no email, shipping or tax handling. The chat interface and
the visual design are a first version and will be redone. The catalog cannot be browsed offline, only the bag can.
