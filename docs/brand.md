# Ak&Ven brand and design system

Premium minimal, in the shop's own colours: white, ink-black and gold (the sign above the container at Dordoi is
gold letters on black). The living reference is the style-guide page of the frontend (`npm run dev`); screenshots
of it are in [`docs/design/`](design/) and double as thesis figures.

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
| `--paper` / `--surface` / `--surface-2` | warm white, white, stone | ink-black family | page, cards, tinted blocks |
| `--ink`, `--ink-2`, `--ink-3` | near-black, warm greys | cream, warm greys | text and primary buttons |
| `--accent` | gold `#C9A24B` | `#D9B45F` | the single accent: highlights, the accent button |
| `--accent-ink` | dark gold `#7A5C14` | gold | gold used as text |
| `--ai` | lilac-purple | light lilac | the negotiator's proposal (the lilac of the printed business card) |
| `--validated` | green | light green | the policy-checked price, the only one that counts |
| `--black`, `--on-black` | always `#100E0B`, cream | same | banners that stay dark in both themes |

Every text and background pair is checked against WCAG AA by `frontend/src/test/contrast.test.ts` in both themes.
Changing a colour is done in `src/styles/tokens.css` only.

## Type

Instrument Serif for headings and brand voice, IBM Plex Sans for interface text, IBM Plex Mono for prices, SKUs and
small labels. All fonts are self-hosted (the app works offline). Fonts are tokens (`--font-display`, `--font-sans`,
`--font-mono`): swapping one changes the whole site.

## Regenerating assets (from `frontend/`)

| Command | Produces |
|---|---|
| `npm run logo` | `public/brand/*.svg` and `src/brand/logo.generated.ts` from `brand/mark-path.json` and Jost |
| `npm run art` | placeholder product illustrations in `public/media/products/` (until real photography exists) |
| `npm run icons` | PWA and favicon PNGs in `public/icons/` |
| `npm run screenshots` | the style guide at phone, tablet and laptop widths, light and dark, into `docs/design/` |

## Open questions

- Logo v1 is a faithful clean-up of the sign; a further refinement pass (stroke weights, the hook's terminal) is possible
  once the owners have reacted to it.
- Currency: prices are displayed in USD for now. The database has no currency column yet.
- Languages: the shop's customers also read Russian and Kyrgyz. The headline font (Instrument Serif) has no Cyrillic
  glyphs; IBM Plex Sans does. Adding Cyrillic means choosing a serif with Cyrillic support for headings.
- Real product photography replaces the generated illustrations when available; image URLs are data in the database.
