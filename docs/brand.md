# AKVEN brand and design system

Elite and modern, in navy and gold: ivory pages keep the shop calm, navy carries the brand moments (the top bar, the
hero, the quality panel, the footer) and gold is kept for detail and savings. Two Kyrgyz ornaments appear only where
they mean something. The living reference is the style-guide page of the frontend (`/styleguide` with `npm run dev`);
screenshots are in [`docs/design/`](design/) and double as thesis figures.

## The mark

**AKVEN** is Akylbek and Venera's names on one label. The mark is the family's own design, redrawn as clean vectors: a
Roman A with a thin left leg and a wide right leg that runs on into the V, a flag serif on the V, and a ribbon that
rises from the A's foot, arches over the A and falls into the V. The ribbon is the "and" of the old Ak&Ven name: the
two initials joined. A thin fold line along the ribbon keeps its folded look in a single colour, and a small gap where
it passes over the A shows which is in front.

The mark lives in `frontend/src/brand/mark.ts` as vector paths, so it stays crisp from a favicon to a sign and works in
one colour for labels and stamps. The name AKVEN is set in Cinzel capitals with wide spacing and the tagline
"PREMIUM SOCKS" in Onest, both converted to outlines, so **the logo needs no font anywhere**. The family may replace it
with a final design later: change `mark.ts` and run `npm run logo`, `npm run icons` and `npm run art`.

| File (`frontend/public/brand/`) | Use |
|---|---|
| `logo-*.svg` | Mark and name on one line: the header, documents, receipts |
| `logo-stacked-*.svg` | Mark above the name and "PREMIUM SOCKS": packaging, labels, signage, the footer |
| `mark-*.svg` | The AV alone: app icon, favicon, sock labels, a wax seal |
| `*-gold-metallic` | Brushed gold for large placements on navy or black |
| `*-gold`, `*-ink`, `*-white` | One colour: print, embroidery, knitting, stamps |

Rules: keep clear space of at least the height of the A's crossbar around the logo; never stretch, outline or
recolour it outside gold, ink and white; minimum width 80 px on screen for the lockup, 16 px for the mark. In the app
use the `<Logo>` component (`variant="full" | "stacked" | "mark"`), which takes its colour from the surrounding text.

## Colour

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--paper` / `--surface` / `--surface-2` | ivory `#F7F4EE`, white, sand | deep navy family | page, cards, tinted blocks |
| `--ink`, `--ink-2`, `--ink-3` | navy ink `#121A2C`, slate greys | cream, warm greys | text and primary buttons |
| `--accent` | gold `#CBA862` | `#D4B373` | the gold button, highlights, ornaments |
| `--accent-ink` | dark gold `#7E5F1E` | gold | gold used as text: eyebrows, savings |
| `--black`, `--black-deep`, `--on-black` | navy `#16223D`, `#0F1930`, cream | same | the top bar, hero, quality panel and footer, navy in both themes |
| `--tint-1` to `--tint-6` | mist, oat, blush, sage, lilac, sand | dark versions | soft backdrops behind product photos, one per card in turn |
| `--warning` | amber | light amber | "only a few left" |
| `--ai` | lilac-purple | light lilac | the negotiator's proposal |
| `--validated` | green | light green | the policy-checked price, the only one that counts |

Every text and background pair is checked against WCAG AA by `frontend/src/test/contrast.test.ts` in both themes.
Changing a colour is done in `src/styles/tokens.css` only.

## Type

Two families, both self-hosted with Latin, Cyrillic and Cyrillic Extended, so Russian and Kyrgyz (ң ө ү) render in the
same faces as English:

- **Cormorant Garamond** for headings: a refined serif, set large, with its italic in gold for emphasis
  ("Korean socks *for the whole family*"). Numbers use lining figures so "70-E" and prices stand straight.
- **Onest** for everything else: text, buttons, forms, prices (tabular figures so they line up).

Buttons are pills with small spaced capitals; on hover a second colour sweeps in from the left and the label changes
colour with it, so it keeps its contrast throughout. Fonts are tokens (`--font-display`, `--font-sans`, `--font-mono`).

## Ornaments

- **Oimo band**, a chain of rhombuses: the shelf the hero socks stand on, and the top edge of the footer.
- **Kochkor muyuz**, ram's horns: the divider before the family's story, and the footer rule.

- **The oimo band knitted into a sock**: the Heritage line's pattern, drawn on the socks themselves.

The two page ornaments are in `frontend/src/brand/Ornaments.tsx` and take their colour from the surrounding text.

## The drawn sock

Until real photos exist, drawn socks stand in for product photography. One drawing (`src/brand/sockDrawing.ts`)
serves both the shop (`SockArt.tsx`) and the product images (`npm run art`), so a sock looks the same in the hero, on a
card and on its page. It has knit texture, a ribbed cuff, a contrast heel and toe and soft shading, five heights
(no-show to knee-high, all drawn on the same leg so they line up), fifteen patterns (rib, pinstripe, stripes,
argyle, dots, hearts, snowflakes, oimo, bear, dino, compression, sparkle, ...) and extras: five toes, a grip sole, a
lace frill, brushed yarn. Every product has two images: the sock, and the pair (or the open gift box). The second
image shows when a card is hovered. Image URLs are data in the database, so photographs replace the drawings one by
one.

## The home page

Built around the family's real stall, container 70-E at Dordoi, so it could not belong to another shop:

| Scene | What it shows |
|---|---|
| Container 70-E | The steel doors, embossed with the mark, swing open on a rail of socks that sway and lean away when the pointer passes; the container's number is stencilled on a plate on the frame |
| Three ways to shop | Why the shop is online: families, shops (wholesale) and companies (gift boxes), each with its own path |
| The family planner | Add each person, their shoe size and pairs; the sock size comes from the size chart and the price step from the ladder; the list can be sent in WhatsApp or Telegram |
| The band | Every kind of sock the stall carries, moving slowly; it stops on hover |
| The shelf | The newest socks, switchable between men, women, kids and gift boxes without leaving the page |
| The fitting | A leg with a ruler; pick a height and the sock is pulled up to it |
| The box | Tap socks into a box and watch the step reached on the real price ladder (`/api/pricing`) |
| The calculator | "Ask for your price" the Dordoi way: the seller types the price and the shop's stamp checks it |
| The gift calendar | Days to 23 February, 8 March, Nooruz, the first day of school and New Year, with the gift boxes |
| The way to 70-E | A drawn route from the city to Dordoi-Junhai, passage 8, container 70-E, and every contact as a card that lights up in its channel's colour |

## Motion

Sections slide in as they scroll into view, the container doors open on load, the socks sway, the road draws
itself and the calculator types. Motion
never fades text, so it keeps full contrast at every moment, and all of it stops for visitors who ask for less motion.

## Regenerating assets (from `frontend/`)

| Command | Produces |
|---|---|
| `npm run logo` | `public/brand/*.svg` and `src/brand/logo.generated.ts` from `brand/mark-path.json` and Jost |
| `npm run art` | placeholder product illustrations in `public/media/products/` (until real photography exists) |
| `npm run icons` | PWA and favicon PNGs in `public/icons/` |
| `npm run screenshots` | the style guide at phone, tablet and laptop widths, light and dark, into `docs/design/` |

## Open questions

- The family is designing a refined logo; when it arrives, `npm run logo` regenerates every logo file and component.
- Currency: prices are displayed in USD for now. The database has no currency column yet.
- Real product photography and the photo of the certificate replace the drawn placeholders when available.
