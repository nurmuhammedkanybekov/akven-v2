# AK&VEN brand and design system

Three things at once: the warmth of a Kyrgyz family business, the quality of Korean socks, and the calm of a modern
international brand. Concretely, COS-like pictures (still lifes in soft afternoon light), MUJI-like ease (plain words,
everything one tap away), and the stall at Dordoi as the signature, with the family's own hand on top: a serif for
headings, their handwriting on tags and notes, a stamp, a board of notes, a thread of yarn. A mostly
ivory page with charcoal text and soft beige behind products; navy for the brand moments (the top bar, buttons, the
night at Dordoi, the footer); gold used sparingly: the ampersand, savings and a few highlights. The Kyrgyz patterns live on the socks
themselves (oimo, shyrdak) and in one band at the top of the footer. The living reference is the style-guide page of the frontend (`/styleguide` with `npm run dev`);
screenshots are in [`docs/design/`](design/) and double as thesis figures.

## The mark

**AK&VEN** is Akylbek and Venera's names on one label: **AK** from Akylbek, **VEN** from Venera, and between them a
gold ampersand drawn as a heart, for what they built together. The mark is the family's final choice (the "print-safe joint"
concept, [`design/logo-reference.png`](design/logo-reference.png)): a Roman A whose swept crossbar runs out of the left
foot, arches over the A and becomes the stroke of the V, the two initials joined in one line. A thin gap where the swoop
passes the A's right leg shows which is in front.

The concept came as an AI-generated image with a pixel-traced vector package, whose outlines were stepped like pixels
when enlarged. The mark used here was traced again from the reference image, upscaled eightfold, into smooth curves
(potrace), and lives in `frontend/src/brand/mark.ts` as one even-odd path: crisp from a favicon to a sign, in any single
colour, for labels and stamps. The name AK&VEN is set in Cinzel SemiBold capitals, heavy enough to stand beside the
mark's thick strokes. The ampersand is not a letter from a font but written: a heart drawn in one stroke from its dip,
down the left side, up the right, and on through itself as the leg of the &, with a small upturned flick. It is
stroked by a simulated broad-nib pen held at 45 degrees (`scripts/calligraphy.mjs`), so it is thick where the stroke
crosses the nib and a hairline where it runs along it, like the swoop of the mark, and turned into a plain filled
shape. Earlier versions used Cinzel's own "&" (too heavy, read as a third name) and the italic "Et" of Cormorant
Garamond, which stays one switch away in the generator (`AMP_STYLE`). The heart is gold on the ink and white logos (and
wherever the page sets `--logo-amp`, such as the header), the same gold on the gold logos. The generator also exports
the pen's centreline, so the shop can let the heart **write itself**: in the header on arrival, in the footer, on the
sign-in page and in "Two names" (a mask along the pen's path, still under reduced motion). In the one-line
logo the mark stands on the same baseline as the letters. The tagline "PREMIUM SOCKS" is in Onest. Both are converted
to outlines, so **the logo needs no font anywhere**. To change the mark, edit `mark.ts`
and run `npm run logo`, `npm run icons` and `npm run art`. Before printing labels or registering the mark, a designer
should check the joins at real size, and the mark should be searched in Kyrgyzpatent and WIPO's Global Brand Database.

## Colour

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--paper` / `--surface` / `--surface-2` | ivory `#F7F4EE`, white, sand | deep navy family | page, cards, tinted blocks |
| `--text` | charcoal `#262626` | warm cream | running text |
| `--ink`, `--ink-2`, `--ink-3` | navy ink `#121A2C`, slate greys | cream, warm greys | primary buttons, selected states, secondary text |
| `--sand` | soft beige `#E9DFD0` | deep navy | behind product sections (bestsellers) |
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

Three faces, each with Latin, Cyrillic and Cyrillic Extended, so Russian and Kyrgyz (ң ө ү) render in the same face as
English, all self-hosted:

- **Headings in Cormorant Garamond** 600, a Garamond cut for display sizes: the serif of a family label, next to the
  Cinzel capitals of the logo. The word a heading leans on is in *italic dark gold* ("for the whole family.").
- **The family's handwriting in Caveat**: the label over a section, the note in the hero, the tags in the fitting room,
  the stall notes and the gift card. Short phrases only, never running text or anything to act on.
- **Onest for everything you read and use**: text, buttons, forms, prices (tabular figures, so they line up).

Fonts are tokens (`--font-display`, `--font-hand`, `--font-sans`), so a face can change in one place. A first try with
Cormorant alone read as a luxury template; with the handwriting, the stamp and the stall's props it reads as a family's
shop, and after a few rounds of heavy sans headings had made the site feel generic, the serif came back this way.

## Ornaments

- **Oimo band**, a chain of rhombuses: the top edge of the footer.
- **The stamp**: a round seal with AK&VEN · DORDOI · 70-E · SINCE 2018 round the edge and the heart in the middle,
  turning slowly in the corner of the hero, like the stamp on a paper bag from the stall (`src/brand/Seal.tsx`).
- **Kraft tags, a cork board with pinned notes, a tailor's tape, a curtain**: the props of a market stall, drawn in CSS.
- **Paper grain**: a faint noise over the page, like the card of a price tag (off in print and high contrast).
- **The yarn thread**: a gold strand along the top of the window that unwinds as you scroll, its ball rolling at the
  end; the menu's underline is the same yarn.
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

Products first, then who is behind them and where, then the shop's own tools.

| Section | What it shows |
|---|---|
| The hero | Words on the left (a handwritten "from container 70-E, Dordoi"; "Socks chosen pair by pair, *for the whole family.*"; who chooses them and since when; two ways in; three promises). The stamp turns in the corner of the still life. On the right a still life on warm beige in afternoon light: an open navy AK&VEN box of folded pairs on tissue, its lid with the gold logo, loose pairs in cream, navy, white and charcoal, a kraft tag. It is drawn from the shop's own sock drawings, not a photograph, and is the one place to put the family's own product photograph when it exists. The pairs settle into place on arrival and shift a little with the pointer, by depth |
| Trust | Five plain facts: Korean-made socks, a family business since 2018, container 70-E with whether it is open now, delivery to four countries, wholesale |
| Shop by who it is for | Four editorial cards (for him, for her, for kids, gift sets): each a still life of that shelf's socks on its own soft backdrop; the picture grows slowly on hover and the arrow moves on |
| The fitting room | Who is trying on, which shoes, how high, which size: the shop's own socks of that height are drawn on a leg (from each product's drawing, in the colour chosen), under rolled-up trousers and beside a tailor's tape, with the shoe over the foot so you see what shows and what stays hidden. Each height is rated for the shoes ("best", "works", "better not") with the reason; the shoe size gives the sock size from the chart. The same fitting room opens from every sock's product page ("Try it on") and is on the size guide |
| Bestsellers | Ranked by pairs in paid orders (`/api/catalog/bestsellers`). Until four socks have really sold, the section is called "New on the shelf" and shows the newest, so nothing is called a bestseller that is not one |
| Two names | "Two names. One family. One story.": AK and VEN slide in from either side, then the gold heart between them is written with the pen; Akylbek, together and Venera underneath |
| From Dordoi, with love | The stall as a scene that plays on scroll: containers on two floors at night; 70-E's sign lights up in gold, the view moves in, the doors open on a rail of socks, and the way to the story and to the stall appears. The section is pinned while it plays; only transforms and opacity change, once per frame. With reduced motion it is the finished scene |
| Notes from the stall | Five notes pinned to a cork board in the family's handwriting, signed Venera, Akylbek or the family: what they tell people at the counter. They swing onto their pins as the board arrives |
| The family planner | Add each person, their shoe size and pairs (or start from the family saved in the account) |
| Gift box | The builder, introduced: a box that changes colour and ribbon and opens and closes |
| Shops and companies | Wholesale by the case, and gift boxes for teams |

**Gift sets** (`/gifts`) gathers the ready-made boxes, the gift box builder, the holiday calendar and the collection
box (tap socks in and watch the price step). **Our story** (`/story`) has the two names, the Dordoi scene and the
family's facts. The fitting room is also on the size guide and on every product page, the way to the stall on the visit page.

## Motion

Sections slide in as they scroll into view, and their handwritten labels are written left to right; the logo's heart
writes itself; the stamp turns; the yarn unwinds with the scroll; in the fitting room the sock is pulled up the leg and
the shoe steps in; the stall notes swing onto their pins; a drawn sock on a card sways from its cuff; the hero's pairs
settle onto the table; AK and VEN meet and the heart is written between them;
the Dordoi scene plays with the scroll; the socks on the rail sway and lean away from the pointer; the gift box opens and
closes; a picture flies into the bag when a sock is added. Motion
never fades text, so it keeps full contrast at every moment, and all of it stops for visitors who ask for less motion.

## Regenerating assets (from `frontend/`)

| Command | Produces |
|---|---|
| `npm run logo` | `public/brand/*.svg` and `src/brand/logo.generated.ts` from `src/brand/mark.ts`, Cinzel and Onest outlines and the pen-drawn heart (`scripts/calligraphy.mjs`) |
| `npm run art` | placeholder product illustrations in `public/media/products/` (until real photography exists), and `specs.json`, the drawing behind each sock, which the fitting room uses to put it on the leg |
| `npm run seed` | the demo seed of the second collection, `backend/.../db/seed/V25__seed_collection_2.sql`, from the same list as its images |
| `npm run icons` | PWA and favicon PNGs in `public/icons/` |
| `npm run screenshots` | the style guide at phone, tablet and laptop widths, light and dark, into `docs/design/` |

## Open questions

- Currency: prices are displayed in USD for now. The database has no currency column yet.
- Real product photography and the photo of the certificate replace the drawn placeholders when available.
