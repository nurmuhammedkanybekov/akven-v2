# Progress

Where the project stands against the supervisor's milestones. Last updated 27 November 2026.

| Milestone | Due | State |
|---|---|---|
| 1. Requirement analysis, skeleton, design diagrams | 25 September | Done: [requirement analysis](requirement-analysis.md), use-case diagrams, wireframes, architecture and diagrams, backend skeleton with CI |
| 2. Prototype with core backend and basic UI | 20 October | Done: accounts, catalogue with filters, checkout with server-side prices and safe stock, the negotiation chat with the PolicyValidator, the rule-based and language-model assistants, Docker setup ([plan](m2-plan.md)) |
| 3. Final program, CI/CD, over 80% coverage | 10 November | Done: 96% backend line coverage (the build fails below 80%), CI on GitHub Actions and the ELTE GitLab, and the features listed in the [README](../README.md) |
| 4. Thesis draft | 22 November | Done and reviewed by the supervisor |
| Thesis upload to Neptun | 1 December | Ready |

## The final system in numbers

- 285 backend tests (11 on real PostgreSQL), 96% line coverage; 217 frontend tests; a 29-step browser journey in three
  languages, plus a customer journey in WebKit and Firefox.
- 115 API endpoints, 26 database tables, 26 schema migrations and 19 demo-data migrations.
- The shop and the administration in English, Russian and Kyrgyz.
- A recorded evaluation of both negotiators with 16 simulated customers
  ([`evaluation/live-2026-10-11.json`](evaluation/live-2026-10-11.json)): no final price went below the owners' limit.

Where each requirement is implemented and which test covers it: [`traceability.md`](traceability.md).

## Known limitations

- Card payment is simulated and moves no money. Customers can reserve and pay at the stall or to the courier.
- Only the bag works offline; product pages need a connection.
- The assistant chooses product facts by keywords; vector search is prepared in the database but not used yet.
- The product pictures are drawings until real photographs are taken.
