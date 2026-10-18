/**
 * Draws the demo catalogue's product images: public/media/products/<slug>-1.svg (the sock on its own) and
 * <slug>-2.svg (the pair, or for a gift box the pairs inside). Placeholders until real photography exists, drawn
 * with the same sock as the shop itself (src/brand/sockDrawing.ts) so cards, pages and the hero match.
 * Deterministic: the same input gives the same files.
 * Run: npm run art
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MARK, markMarkup } from "../src/brand/mark.ts";
import { SOCK_COLOURS as C, sockBounds, sockMarkup } from "../src/brand/sockDrawing.ts";
import { COLLECTION_2 } from "./collection-2.mjs";
import { COLLECTION_3 } from "./collection-3.mjs";
import { LEGACY_COLOURS, collectionColours, colourSlug, colourise } from "./colours.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const W = 800, H = 1000;

/** Places one sock so its bounds fit a box of `fit` units centred on (cx, cy). */
function placed(spec, id, { cx, cy, fit, rotate = 0, flip = false }) {
  const b = sockBounds(spec.cut);
  const s = Math.min(fit / b.w, (fit * 1.25) / b.h);
  const tx = cx - (b.x + b.w / 2) * s * (flip ? -1 : 1);
  const ty = cy - (b.y + b.h / 2) * s;
  return `<g transform="rotate(${rotate} ${cx} ${cy}) translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${flip ? -s : s} ${s})">${sockMarkup(spec, id)}</g>`;
}

function frame(tint, body, { floor = 870 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img">
  <defs><radialGradient id="light" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="${tint}"/>
  <rect width="${W}" height="${H}" fill="url(#light)"/>
  <ellipse cx="400" cy="${floor}" rx="260" ry="20" fill="#000" fill-opacity=".08"/>
  ${body}
  <g transform="translate(716 936) scale(${(40 / MARK.h).toFixed(4)})" opacity=".55">${markMarkup("#b08d57", "wm")}</g>
</svg>
`;
}

const single = (slug, spec) => placed(spec, `${slug}-a`, { cx: 400, cy: 500, fit: 560, rotate: -6 });
const pair = (slug, spec) =>
  placed(spec, `${slug}-b`, { cx: 330, cy: 470, fit: 470, rotate: -12 }) +
  placed(spec, `${slug}-c`, { cx: 470, cy: 540, fit: 470, rotate: 4 });

/** A gift box, open at the top, with pairs standing inside and an emblem on the band. */
function box(slug, { colour, ribbon, emblem, socks }) {
  const inner = socks.map((spec, i) => {
    const n = socks.length;
    const cx = 250 + (300 / Math.max(1, n - 1)) * i;
    return placed(spec, `${slug}-in${i}`, { cx, cy: 430, fit: 300, rotate: (i - (n - 1) / 2) * 7 });
  }).join("");
  return `
  <defs>
    <linearGradient id="bx" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
  </defs>
  <path d="M150 470L190 420H610L650 470Z" fill="${colour}"/><path d="M150 470L190 420H610L650 470Z" fill="#000" fill-opacity=".35"/>
  ${inner}
  <rect x="140" y="470" width="520" height="390" rx="10" fill="${colour}"/>
  <rect x="140" y="470" width="520" height="390" rx="10" fill="url(#bx)"/>
  <rect x="140" y="470" width="520" height="18" fill="#000" fill-opacity=".12"/>
  <rect x="140" y="612" width="520" height="56" fill="${ribbon}"/>
  <rect x="140" y="612" width="520" height="56" fill="url(#bx)"/>
  <circle cx="400" cy="640" r="62" fill="${ribbon}" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>
  <g transform="translate(400 640)" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${EMBLEMS[emblem]}</g>
  <g transform="translate(400 790) scale(${(58 / MARK.h).toFixed(4)}) translate(${-MARK.w / 2} ${-MARK.h / 2})" opacity=".9">${markMarkup(ribbon, "bx" + slug)}</g>`;
}

const EMBLEMS = {
  tulip: `<path d="M0 34V-4M0 -4C-20 -6 -22 -30 -16 -40L-6 -28L0 -42L6 -28L16 -40C22 -30 20 -6 0 -4ZM0 20C-10 8 -22 8 -26 12M0 26C10 14 22 14 26 18"/>`,
  star: `<path d="M0 -36L10 -12L36 -11L16 6L23 32L0 18L-23 32L-16 6L-36 -11L-10 -12Z"/>`,
  oimo: `<path d="M0 -36L36 0L0 36L-36 0Z"/><path d="M0 -16L16 0L0 16L-16 0Z"/>`,
  snow: `<path d="M0 -38V38M-33 -19L33 19M-33 19L33 -19M-8 -30L0 -22L8 -30M-8 30L0 22L8 30"/>`,
  pencil: `<path d="M-26 26L-20 8L14 -26L26 -14L-8 20Z"/><path d="M-20 8L-8 20M8 -20L20 -8"/>`,
  week: `<rect x="-30" y="-26" width="60" height="54" rx="6"/><path d="M-30 -10H30M-16 -34V-20M16 -34V-20M-14 4H-6M4 4H12M-14 16H-6"/>`,
  heart: `<path d="M0 30C-34 6-34-22-16-26C-8-28 -2-22 0-14C2-22 8-28 16-26C34-22 34 6 0 30Z"/>`,
  ring: `<circle cx="-10" cy="6" r="20"/><circle cx="12" cy="6" r="20"/><path d="M-4-30L2-20L8-30"/>`,
  mountain: `<path d="M-38 26L-12-18L4 6L16-10L38 26Z"/><path d="M-18-8L-12-18L-6-8"/>`,
  moon: `<path d="M6-34A34 34 0 1 0 30 18A26 26 0 1 1 6-34Z"/><path d="M20-22V-12M15-17H25"/>`,
  ball: `<circle r="32"/><path d="M0-12L11-4L7 9H-7L-11-4Z"/><path d="M0-12V-32M11-4L30-10M7 9L18 26M-7 9L-18 26M-11-4L-30-10"/>`,
  foot: `<path d="M-6 30C-22 30-22 8-14-6C-8-16-6-26 2-26C14-26 14-6 8 8C4 18 8 30-6 30Z"/><circle cx="16" cy="-30" r="3"/><circle cx="22" cy="-22" r="3"/><circle cx="25" cy="-12" r="3"/>`,
};

const S = (cut, main, accent, pattern = "plain", extra = {}) => ({ cut, main, accent, pattern, ...extra });

/** Every demo product: its backdrop tint, and either a sock or a box. */
const PRODUCTS = {
  // the first catalogue (V2, V4)
  "wool-crew-classic":    { tint: "#efeae0", sock: S("crew", C.charcoal, C.grey, "rib") },
  "bamboo-no-show":       { tint: "#f3e8e3", sock: S("no-show", C.white, C.beige) },
  "merino-dress-black":   { tint: "#ebe7df", sock: S("crew", C.black, C.gold, "pinstripe", { heel: false }) },
  "sport-cushion-crew":   { tint: "#e9ebec", sock: S("crew", C.white, C.navy, "stripes") },
  "thermal-knee-high":    { tint: "#ece4d8", sock: S("knee-high", C.charcoal, C.beige, "rib") },
  "cotton-ankle-daily":   { tint: "#eeebe5", sock: S("ankle", C.white, C.grey) },
  "soft-cotton-ankle":    { tint: "#f1e7e0", sock: S("ankle", C.beige, C.rose) },
  "wool-knee-high-women": { tint: "#efe8dc", sock: S("knee-high", C.cream, C.brown, "rib") },
  "sport-ankle-women":    { tint: "#f3e8e6", sock: S("ankle", C.white, C.pink, "stripes") },
  "kids-cartoon-crew":    { tint: "#e7eef1", sock: S("crew", C.sky, C.mustard, "multistripe", { second: C.coral }) },
  "kids-sport-ankle":     { tint: "#e8eee9", sock: S("ankle", C.white, C.mint, "stripes") },
  // the fuller assortment (V18)
  "business-rib-crew":    { tint: "#e6e8ec", sock: S("crew", C.navy, C.navy, "rib", { heel: false }) },
  "argyle-crew":          { tint: "#ece6d8", sock: S("crew", C.navy, C.gold, "argyle", { second: C.cream }) },
  "seoul-stripe-crew":    { tint: "#e6edf2", sock: S("crew", C.sky, C.mustard, "multistripe", { second: C.coral }) },
  "five-toe-ankle":       { tint: "#ebebea", sock: S("ankle", C.black, C.grey, "plain", { toes: true }) },
  "run-compression":      { tint: "#ece8dd", sock: S("mid-long", C.black, C.mustard, "compression") },
  "mountain-hiker-crew":  { tint: "#e9e7da", sock: S("crew", C.olive, C.oat, "rib") },
  "bamboo-no-show-men":   { tint: "#e8e8e6", sock: S("no-show", C.black, C.charcoal) },
  "oimo-crew":            { tint: "#ece4d6", sock: S("crew", C.navy, C.brick, "oimo", { second: C.gold }) },
  "lace-trim-ankle":      { tint: "#f3e9e6", sock: S("ankle", C.white, C.rose, "plain", { lace: true, second: "#ffffff" }) },
  "little-heart-crew":    { tint: "#f4e6e8", sock: S("crew", C.pink, C.red, "hearts") },
  "cashmere-touch-crew":  { tint: "#efe8dc", sock: S("crew", C.oat, C.beige, "plain", { fluffy: true }) },
  "polka-no-show":        { tint: "#f3e7e6", sock: S("no-show", C.rose, C.white, "dots") },
  "yoga-grip":            { tint: "#e7eee6", sock: S("ankle", C.sage, C.coral, "plain", { grip: true, second: C.white }) },
  "cloud-home-socks":     { tint: "#ece8f2", sock: S("mid-long", C.lilac, C.white, "plain", { fluffy: true, grip: true, heel: false }) },
  "oimo-knee-high":       { tint: "#efe7d6", sock: S("knee-high", C.cream, C.navy, "oimo", { second: C.gold }) },
  "sparkle-ankle":        { tint: "#e9e6e1", sock: S("ankle", C.black, C.gold, "sparkle", { second: "#ffffff" }) },
  "five-toe-no-show":     { tint: "#f0e9e0", sock: S("no-show", C.beige, C.oat, "plain", { toes: true }) },
  "rib-knee-high":        { tint: "#ebe7e2", sock: S("knee-high", C.black, C.black, "rib", { heel: false }) },
  "little-bear-crew":     { tint: "#efe7da", sock: S("crew", C.beige, C.brown, "bear", { second: C.cream }) },
  "dino-ankle":           { tint: "#e5eee8", sock: S("ankle", C.mint, C.forest, "dino", { second: C.white }) },
  "kids-home-grip":       { tint: "#f1e4e2", sock: S("crew", C.red, C.white, "stripes", { grip: true, second: C.mustard }) },
  "school-knee-high":     { tint: "#e6e9ef", sock: S("knee-high", C.navy, C.white, "stripes", { heel: false }) },
  "first-steps":          { tint: "#f4e8ec", sock: S("ankle", C.pink, C.white, "dots", { grip: true, second: C.coral }) },
  "snowflake-crew-kids":  { tint: "#efe4e2", sock: S("crew", C.red, C.white, "snow") },
  // bundles and gift boxes
  "bazaar-family-pack": { tint: "#efe9d8", box: { colour: "#e9dfc8", ribbon: C.brick, emblem: "oimo",
    socks: [S("crew", C.charcoal, C.grey, "rib"), S("ankle", C.beige, C.rose), S("crew", C.sky, C.mustard, "multistripe", { second: C.coral })] } },
  "winter-warm-bundle": { tint: "#ece4d8", box: { colour: C.forest, ribbon: C.gold, emblem: "snow",
    socks: [S("knee-high", C.charcoal, C.beige, "rib"), S("crew", C.oat, C.beige, "plain", { fluffy: true }), S("crew", C.red, C.white, "snow")] } },
  "gift-box-8-march": { tint: "#f4e6e6", box: { colour: "#e7c3c3", ribbon: C.gold, emblem: "tulip",
    socks: [S("ankle", C.white, C.rose, "plain", { lace: true, second: "#ffffff" }), S("crew", C.pink, C.red, "hearts"), S("ankle", C.black, C.gold, "sparkle", { second: "#ffffff" }), S("crew", C.lilac, C.white, "plain", { fluffy: true })] } },
  "gift-box-23-feb": { tint: "#e5e8ee", box: { colour: C.navy, ribbon: C.gold, emblem: "star",
    socks: [S("crew", C.navy, C.gold, "argyle", { second: C.cream }), S("crew", C.charcoal, C.charcoal, "rib", { heel: false }), S("crew", C.navy, C.brick, "oimo", { second: C.gold })] } },
  "nooruz-box": { tint: "#efe6d6", box: { colour: C.brick, ribbon: C.gold, emblem: "oimo",
    socks: [S("crew", C.cream, C.navy, "oimo", { second: C.gold }), S("crew", C.navy, C.brick, "oimo", { second: C.gold }), S("ankle", C.cream, C.brick, "oimo", { second: C.gold })] } },
  "new-year-box": { tint: "#e6ece6", box: { colour: C.forest, ribbon: C.red, emblem: "snow",
    socks: [S("crew", C.red, C.white, "snow"), S("crew", C.white, C.red, "snow"), S("mid-long", C.lilac, C.white, "plain", { fluffy: true, heel: false })] } },
  "back-to-school-pack": { tint: "#e9ebf0", box: { colour: C.mustard, ribbon: C.navy, emblem: "pencil",
    socks: [S("knee-high", C.navy, C.white, "stripes", { heel: false }), S("crew", C.white, C.navy, "stripes"), S("ankle", C.white, C.mint, "stripes")] } },
  "office-week-pack": { tint: "#e8e8ea", box: { colour: C.charcoal, ribbon: C.gold, emblem: "week",
    socks: [S("crew", C.navy, C.navy, "rib", { heel: false }), S("crew", C.black, C.gold, "pinstripe", { heel: false }), S("crew", C.charcoal, C.charcoal, "rib", { heel: false }), S("crew", C.navy, C.gold, "argyle", { second: C.cream })] } },
};

for (const p of COLLECTION_2) PRODUCTS[p.slug] = p.box ? { tint: p.tint, box: p.box } : { tint: p.tint, sock: p.sock };
// The classics are drawn in their first colour by default.
for (const p of COLLECTION_3) PRODUCTS[p.slug] = { tint: p.tint, sock: colourise(p.sock, collectionColours(p)[0][1]) };

/** Every sock product's colours, for the pictures that change with the colour chosen. */
const COLOURS = { ...LEGACY_COLOURS };
for (const p of [...COLLECTION_2, ...COLLECTION_3]) if (!p.box) COLOURS[p.slug] = collectionColours(p);
const BASE = Object.fromEntries([...COLLECTION_3].map((p) => [p.slug, p.sock]));

const outDir = path.join(root, "public/media/products");
fs.mkdirSync(outDir, { recursive: true });
let files = 0;
const write = (name, svg) => { fs.writeFileSync(path.join(outDir, name), svg); files++; };
for (const [slug, p] of Object.entries(PRODUCTS)) {
  if (p.sock) {
    write(`${slug}-1.svg`, frame(p.tint, single(slug, p.sock)));
    write(`${slug}-2.svg`, frame(p.tint, pair(slug, p.sock)));
    for (const [name, hex] of COLOURS[slug] ?? []) {
      const spec = colourise(BASE[slug] ?? p.sock, hex);
      const c = colourSlug(name);
      write(`${slug}--${c}-1.svg`, frame(p.tint, single(`${slug}-${c}`, spec)));
      write(`${slug}--${c}-2.svg`, frame(p.tint, pair(`${slug}-${c}`, spec)));
    }
  } else {
    write(`${slug}-1.svg`, frame(p.tint, box(slug, p.box)));
    const n = p.box.socks.length;
    const fan = p.box.socks.map((spec, i) => placed(spec, `${slug}-f${i}`, { cx: 220 + (360 / Math.max(1, n - 1)) * i, cy: 500, fit: 330, rotate: (i - (n - 1) / 2) * 9 })).join("");
    write(`${slug}-2.svg`, frame(p.tint, fan));
  }
}
console.log(`wrote ${files} product images to public/media/products`);
