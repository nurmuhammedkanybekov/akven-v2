# AKVEN brand and design system

Plain and direct, after Wise and Bombas: one typeface with heavy, tight headings, flat blocks of colour, sentence-case
labels and no decoration that does not carry meaning. Ivory pages keep the shop calm, navy carries the brand moments
(the top bar, the hero, the footer) and gold is kept for the logo and savings. The Kyrgyz patterns live on the socks
themselves (oimo, shyrdak) and in one band at the top of the footer. The living reference is the style-guide page of the frontend (`/styleguide` with `npm run dev`);
screenshots are in [`docs/design/`](design/) and double as thesis figures.

## The mark

**AKVEN** is Akylbek and Venera's names on one label. The mark is the family's final choice (the "print-safe joint"
concept, [`design/logo-reference.png`](design/logo-reference.png)): a Roman A whose swept crossbar runs out of the left
foot, arches over the A and becomes the stroke of the V, the two initials joined in one line. A thin gap where the swoop
passes the A's right leg shows which is in front.

The concept came as an AI-generated image with a pixel-traced vector package, whose outlines were stepped like pixels
when enlarged. The mark used here was traced again from the reference image, upscaled eightfold, into smooth curves
(potrace), and lives in `frontend/src/brand/mark.ts` as one even-odd path: crisp from a favicon to a sign, in any single
colour, for labels and stamps. The name AKVEN is set in Cinzel SemiBold capitals, heavy enough to stand beside the mark's thick strokes; in the one-line
logo the mark stands on the same baseline as the letters. The tagline "PREMIUM SOCKS" is in Onest. Both are converted
to outlines, so **the logo needs no font anywhere**. To change the mark, edit `mark.ts`
and run `npm run logo`, `npm run icons` and `npm run art`. Before printing labels or registering the mark, a designer
should check the joins at real size, and the mark should be searched in Kyrgyzpatent and WIPO's Global Brand Database.

## Colour

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--paper` / `--surface` / `--surface-2` | ivory `#F7F4EE`, white, sand | deep navy family | page, cards, tinted blocks |
| `--ink`, `--ink-2`, `--ink-3` | navy ink `#121A2C`, slate greys | cream, warm greys | text and primary buttons |
| `--accent` | gold `#CBA862` | `#D4B373` | the gold button, highlights, ornaments |
| `--accent-ink` | dark gold `#7E5F1E` | gold | gold used as text: eyebrows, savings |
| `--black`, `--black-deep`, `--on-black` | navy `#16223D`, `#0F1930`, cream | same | the top bar, hero, wholesale and route panels and footer, navy in both themes |
| `--tint-1` to `--tint-6` | mist, oat, blush, sage, lilac, sand | dark versions | soft backdrops behind product photos, one per card in turn |
| `--warning` | amber | light amber | "only a few left" |
| `--ai` | lilac-purple | light lilac | the negotiator's proposal |
| `--validated` | green | light green | the policy-checked price, the only one that counts |

Every text and background pair is checked against WCAG AA by `frontend/src/test/contrast.test.ts` in both themes.
Changing a colour is done in `src/styles/tokens.css` only.

## Type

One family, **Onest**, self-hosted with Latin, Cyrillic and Cyrillic Extended, so Russian and Kyrgyz (ң ө ү) render in
the same face as English:

- **Headings** in Onest 800, set large and tight (letter-spacing about −0.04em), the way Wise sets its headlines.
  Emphasis is colour (gold on navy, dark gold on ivory), never italics.
- **Text, buttons, forms and prices** in Onest 400 to 700; prices use tabular figures so they line up.

Buttons are pills with a sentence-case label; labels over headings are plain words, not spaced-out capitals. Fonts are
tokens (`--font-display`, `--font-sans`, `--font-mono`), so a face can change in one place. An earlier version set
headings in Cormorant Garamond with gold italics; it read as a luxury template rather than a family stall, and was
dropped.

## Ornaments

- **Oimo band**, a chain of rhombuses: the top edge of the footer.
- **The oimo and shyrdak patterns knitted into socks**: the Heritage line's designs, drawn on the socks themselves.

The footer band is in `frontend/src/brand/Ornaments.tsx` and takes its colour from the surrounding text.

## The drawn sock

Until real photos exist, drawn socks stand in for product photography. One drawing (`src/brand/sockDrawing.ts`)
serves both the shop (`SockArt.tsx`) and the product images (`npm run art`), so a sock looks the same in the hero, on a
card and on its page. It has knit texture, a ribbed cuff, a contrast heel and toe and soft shading, five heights
(no-show to knee-high, all drawn on the same leg so they line up), forty-one patterns (rib, pinstripe, stripes,
argyle, checks, gingham, houndstooth, zigzag, fair isle, cable knit, camo, leopard, tie-dye, ombre, colour block,
cherries, lemons, daisies, stars, moons, a night skyline, the Ala-Too mountains, the oimo and shyrdak ornaments, cat,
bunny, bear and dino faces, paws, football, rainbow, pixel hearts, ...) and extras: five toes, a grip sole, a lace frill,
brushed yarn, a pom-pom heel. The demo catalogue's second collection (`scripts/collection-2.mjs`) is one list that
drives both its images (`npm run art`) and its database seed (`npm run seed`). Every product has two images: the sock, and the pair (or the open gift box). The second
image shows when a card is hovered. Image URLs are data in the database, so photographs replace the drawings one by
one.

## The home page

Ordered by the questions a visitor has: what does it cost, what is there, why here, and then the shop's own tools.

| Section | What it shows |
|---|---|
| The hero | In place of a photograph, a Dordoi passage at night: a string of bulbs, containers on two floors with a walkway, and in the middle of the lower floor container 70-E under its lit AKVEN sign. Its doors swing outwards on their hinges onto a rail of socks that drop into their swing, sway and lean away from the pointer, with warm light on the ground and the neighbours. The centred headline sits over the upper floor |
| The washing line | The drawn socks pegged on a rope across the page, drifting and swaying, leaning away when the pointer passes |
| Shop by family member | Four flat colour tiles: men, women, kids, gift boxes |
| The shelf | The newest socks, switchable between men, women, kids and gift boxes without leaving the page |
| The facts | Big figures from the shop's own data (designs on the shelf, the top discount, since 2018, four countries) and the three ordering steps |
| The box | Tap socks into the AKVEN box and watch the step reached on the real price ladder (`/api/pricing`) |
| The family planner | Add each person, their shoe size and pairs; the sock size comes from the size chart and the price step from the ladder; the list can be sent in WhatsApp or Telegram |
| Ask for your price | The negotiation the Dordoi way: the seller types the price and the shop's stamp checks it |
| The gift calendar | Days to 23 February, 8 March, Nooruz, the first day of school and New Year, with the gift boxes |
| Shops and companies | Two blocks: wholesale by the case, and gift boxes for teams |
| The family and the way to 70-E | The story, and a drawn route from the city to Dordoi-Junhai, passage 8, container 70-E, with every contact |

The height fitting (a leg with a ruler; pick a height and the sock is pulled up to it) is on the size guide.

## Motion

Sections slide in as they scroll into view, the container doors open on load, the socks on the rail and on the line sway, the road draws itself and the
calculator types. Motion
never fades text, so it keeps full contrast at every moment, and all of it stops for visitors who ask for less motion.

## Regenerating assets (from `frontend/`)

| Command | Produces |
|---|---|
| `npm run logo` | `public/brand/*.svg` and `src/brand/logo.generated.ts` from `brand/mark-path.json` and Jost |
| `npm run art` | placeholder product illustrations in `public/media/products/` (until real photography exists) |
| `npm run seed` | the demo seed of the second collection, `backend/.../db/seed/V25__seed_collection_2.sql`, from the same list as its images |
| `npm run icons` | PWA and favicon PNGs in `public/icons/` |
| `npm run screenshots` | the style guide at phone, tablet and laptop widths, light and dark, into `docs/design/` |

## Open questions

- The family is designing a refined logo; when it arrives, `npm run logo` regenerates every logo file and component.
- Currency: prices are displayed in USD for now. The database has no currency column yet.
- Real product photography and the photo of the certificate replace the drawn placeholders when available.
