# Ak&Ven brand and design system

Elite and modern, in navy and gold: ivory pages keep the shop calm, navy carries the brand moments (the top bar, the
hero, the quality panel, the footer) and gold is kept for detail and savings. Two Kyrgyz ornaments appear only where
they mean something. The living reference is the style-guide page of the frontend (`/styleguide` with `npm run dev`);
screenshots are in [`docs/design/`](design/) and double as thesis figures.

## The mark

Akyl and Venera's initials around a heart that is also an ampersand. The mark was rebuilt from the physical sign:
the silhouette was extracted from a photo and redrawn as smooth tapering strokes (heart with a swan-neck hook on the
left and a flame-tipped curl on the right), so it is clean vector at any size. The letters AK and VEN are set in
Jost Medium with wide tracking and converted to outlines, so **the logo needs no font anywhere**.

| File (`frontend/public/brand/`) | Use |
|---|---|
| `logo-gold-metallic.svg` | Large placements on black: hero, packaging, signage |
| `logo-gold.svg` | Flat gold, on white or black |
| `logo-ink.svg` / `logo-white.svg` | One-colour uses: print, stamps, emails, light or dark backgrounds |
| `mark-*.svg` | The heart alone: app icon, avatar, favicon, watermark |

Rules: keep the clear space of at least the height of the letter "A" around the logo; never stretch, outline or
recolour it outside gold, ink and white; minimum width 80 px on screen. In the app use the `<Logo>` component, which
takes its colour from the surrounding text colour.

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

One family, **Onest**, self-hosted with its Latin and Cyrillic files, so Russian and Kyrgyz (ң ө ү) render in the
same face as English. Headings use weight 600 with tight tracking, body text 400, the hero lead 300. Prices and
quantities use tabular figures so they line up. Fonts are tokens (`--font-display`, `--font-sans`, `--font-mono`).

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
| Container 70-E | The steel doors swing open on a rail of socks that sway, and lean away when the pointer passes |
| The band | Every kind of sock the stall carries, moving slowly; it stops on hover |
| The shelf | The newest socks, switchable between men, women, kids and gift boxes without leaving the page |
| The fitting | A leg with a ruler; pick a height and the sock is pulled up to it |
| The box | Tap socks into a box and watch the step reached on the real price ladder (`/api/pricing`) |
| The calculator | "Ask for your price" the Dordoi way: the seller types the price and the shop's stamp checks it |
| The gift calendar | Days to 23 February, 8 March, Nooruz, the first day of school and New Year, with the gift boxes |
| The way to 70-E | A drawn route from the city to Dordoi-Junhai, passage 8, container 70-E |

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
