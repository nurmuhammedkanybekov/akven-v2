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
| Brand and second design round | Done: the AK&VEN name and the family's own AV mark as vectors (logo files in four colours, app icons, sock-label mark), Cormorant Garamond and Onest with full Kyrgyz letters, and a distinct look per page. New: the family planner, wholesale and gift-box request form, ordering the bag by WhatsApp, Telegram or email, saved and recently viewed socks, a drawn route to container 70-E, Facebook among the contacts, and 30 more socks in the demo assortment (20 migrations). Checked at 320 to 1440 px in all three languages |
| Accounts, roles and the audit log | Done: a super admin role above the owners (V21). The super admin creates owner and staff accounts, changes roles, disables accounts and sets new passwords (UC-9), reads the whole audit log, and switches the assistant; owners mark trusted customers on a Customers screen. A disabled account or a new password ends its sessions at once. Real contacts and the first super admin come from an ignored `.env`, never from the repository |
| Admin in three languages | Done: every admin screen, the price chat and the shared messages in English, Russian and Kyrgyz, checked by a test that every key exists in all three |
| The AI assistant | Done: a real conversation (every turn stored, V21), answers in the customer's language, the public price ladder and stock in the prompt, a number check in all three languages, one retry when the free plan is busy, and a run-time switch between the AI and the rules. Tested live against gemini-3.5-flash-lite |
| Som prices, opening hours, quick view | Done (V23): the owners set the som rate and rounding, customers switch between dollars and som (the chat quotes som too); the stall's hours are times and days, so the site says "open now, until 16:00" in Bishkek time; a redesigned visit page; quick view on every sock card; the home page's opening scene fills the first screen, with new "shop by family member" and "how ordering works" sections. Sign-in through the Docker demo fixed (the proxy kept the port off the address, so every POST was refused) and now checked in CI |
| Hardening and the final design round | Done (V25): every installation signs logins with its own random key (no key in the repository); demo accounts switch off on a real installation; sign-ups limited per address, with the visitor's address taken from the proxy; a strict Content-Security-Policy and other security headers, checked in CI; the shop listens on this computer only by default; owners can set a new password for a customer or switch a fake account off; `scripts/backup.sh`. Design: one typeface (heavy Onest headings), a price calculator in the hero, a washing line of socks, flat colour blocks, ten home sections instead of thirteen. 26 new knit patterns and 57 more demo products (100 in all), generated with their seed from one list. The dashboard adds sales, orders waiting at the stall and socks running out |
| Final round of polish | Done (V26 to V28): the home page opens on a Dordoi passage at night, containers on two floors with 70-E opening in the middle (doors that swing outwards in every browser); a balanced one-line logo; roubles next to dollars and som, with the theme switch, in the top bar; the shop's email; links to a section ("Plan a family set") scroll to it. A classic line (18 products, 452 options) and a drawing for every colour of every sock, shown when the colour is chosen; owners can give their own photos a colour. New: "Tell me when it's back" with a waiting list on the dashboard, "Order these again", and a QR pickup code the stall can scan. Smoother motion across the shop |
| Family, gifts and the last audit | Done (V29): family profiles in the customer's account (names, shoe sizes, birthdays), used by the home page planner and product pages ("this shelf fits: Venera (38)"), with birthday reminders; a gift box builder (box, ribbon, a card, socks from any shelf) sent with the order and shown to the family for packing; a sock finder in three taps; shareable saved lists; when an order can be collected; an order timeline; the picture flying into the bag and confetti when an order is paid. Security and bug audit: password length, CORS for idempotency keys, a cap on waiting-list rows, colours checked before they reach markup, checkout and order pages translated into Russian and Kyrgyz, the right colour's picture in the bag and on receipts |
| The AK&VEN round | Done: the brand becomes AK&VEN, with a gold ampersand between AK (Akylbek) and VEN (Venera) in every logo file, the header, the titles and the texts. The home page shows the socks first (a still life in the hero, editorial shelf cards, bestsellers ranked by real sales from a new public endpoint), then the family ("Two names. One family. One story.") and the stall as a scene that plays on scroll; new Gift sets and Our story pages; a calmer palette (ivory, charcoal text, soft beige behind products, gold kept for accents); a simpler menu with Wholesale on its own. Product cards no longer overflow narrow phones |
| Ten improvements | Done (V30): verified-buyer reviews with moderation (product page, home page, admin); instant search with keyboard navigation and recent searches (and the catalogue now honours a search term); a bag drawer with the collection price and a matching sock; "Match the whole family" on product pages; pairs sold this week from real orders; saved socks kept with the account; a seasonal chip for the next gift holiday; the knit up close with a magnifier; a "for you" home row from the saved family and recently viewed socks; sales per day and a CSV export (defused against formula injection) for the owners |
| Remaining gaps | Real product photos (the hero still life and the shelf cards are drawn until then), real customer reviews (the feature is built; it fills as customers receive their orders), the family's own story text, a native speaker's check of the Russian and Kyrgyz texts |
| Evaluation of the negotiator | Done: the comparison uses a recorded live run of gemini-3.5-flash-lite on the 16 simulated customers (`docs/evaluation/live-2026-10-11.json`); no final price went below the limit, and the AI gave smaller discounts than the rules (6% against 11% on average). The super admin can repeat it live. Still to agree with the supervisor: whether to add a small user study |

## Milestone 4: thesis draft (due 22 November)

Not started. The technical chapters can follow the structure of `architecture.md` and `traceability.md`.

## Known limitations

The payment wallet is simulated and no money moves; with a real provider the charge would move out of the checkout
transaction (see `architecture.md`, Known limitations). There is no email, shipping or tax handling. The logo is the family's
chosen design for now and may still change. The catalog cannot be browsed offline, only the bag can.
