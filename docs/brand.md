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

Both are in `frontend/src/brand/Ornaments.tsx` and take their colour from the surrounding text. Until real photos
exist, drawn socks (`SockArt.tsx`) stand in for product photography; image URLs are data in the database.

## Motion

Sections slide in as they scroll into view, the hero text rises on load and the socks rise onto their shelf. Motion
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
