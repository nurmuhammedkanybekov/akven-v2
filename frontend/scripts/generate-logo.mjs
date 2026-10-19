/**
 * Builds the AK&VEN logo files from two sources of truth:
 *   - src/brand/mark.ts     the AV mark, as vectors drawn from the family's chosen design
 *   - Cinzel (name) and Onest (tagline), converted to outlines here so the finished
 *                           logo needs no font anywhere (web, print, signage, sock labels, favicon)
 * Output: public/brand/*.svg in gold, ink, white and metallic gold, in three lockups (horizontal, stacked, mark),
 * and src/brand/logo.generated.ts for the React <Logo>.
 * Run: npm run logo
 */
import opentype from "opentype.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MARK, markMarkup } from "../src/brand/mark.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = (file) => { const b = fs.readFileSync(path.join(root, "node_modules/@fontsource", file)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
// Cinzel 600: heavy enough to stand next to the mark's thick strokes, still a Roman capital.
const font = load("cinzel/files/cinzel-latin-600-normal.woff");
// The ampersand is lighter and a little smaller, so it reads as the link between AKylbek and VENera, not a letter.
const light = load("cinzel/files/cinzel-latin-400-normal.woff");
const sans = load("onest/files/onest-latin-400-normal.woff");

const SIZE = 100;
const CAP = (font.tables.os2.sCapHeight / font.unitsPerEm) * SIZE;
const f = (n) => +n.toFixed(2);

/** Text as outlines with the baseline at y = 0, starting at x = 0. Tracking is added between letters only. */
function outline(text, size, tracking, face = font) {
  const p = face.getPath(text, 0, 0, size, { letterSpacing: tracking, kerning: true });
  const bb = p.getBoundingBox();
  return { d: p.toPathData(2), x1: bb.x1, x2: bb.x2, y1: bb.y1, y2: bb.y2 };
}

// AK & VEN on one baseline: the ampersand gets the same space either side as the letters have between them.
const TRACK = 0.3, AMP = 0.98;
const ak = font.getPath("AK", 0, 0, SIZE, { letterSpacing: TRACK, kerning: true });
const akBox = ak.getBoundingBox();
const space = SIZE * 0.17;
const ampProbe = light.getPath("&", 0, 0, SIZE * AMP).getBoundingBox();
const ampX = akBox.x2 + space - ampProbe.x1;
const ampPath = light.getPath("&", ampX, 0, SIZE * AMP);
const ampBox = ampPath.getBoundingBox();
const venProbe = font.getPath("VEN", 0, 0, SIZE, { letterSpacing: TRACK, kerning: true }).getBoundingBox();
const ven = font.getPath("VEN", ampBox.x2 + space - venProbe.x1, 0, SIZE, { letterSpacing: TRACK, kerning: true });
const venBox = ven.getBoundingBox();
const word = { d: ak.toPathData(2) + ven.toPathData(2), x1: akBox.x1, x2: venBox.x2, y1: Math.min(akBox.y1, venBox.y1), y2: Math.max(akBox.y2, venBox.y2) };
const amp = { d: ampPath.toPathData(2) };

// The three parts on their own, each starting at x = 0 on the baseline, for the story section where AK and VEN meet
// at the ampersand.
const part = (p) => { const b = p.getBoundingBox(); return { d: p.toPathData(2), x: f(b.x1), w: f(b.x2 - b.x1) }; };
const parts = {
  ak: part(font.getPath("AK", 0, 0, SIZE, { letterSpacing: TRACK, kerning: true })),
  amp: part(light.getPath("&", 0, 0, SIZE * AMP)),
  ven: part(font.getPath("VEN", 0, 0, SIZE, { letterSpacing: TRACK, kerning: true })),
  top: f(-CAP), cap: f(CAP),
};
const tag = outline("PREMIUM SOCKS", SIZE * 0.22, 0.42, sans);

// Horizontal: the mark stands on the same baseline as the capitals (its feet overshoot it a little, like a serif),
// rising well above them, so the two read as one line rather than a picture next to a word.
const hMarkH = CAP * 1.7, hScale = hMarkH / MARK.h, hMarkW = MARK.w * hScale;
const hGap = CAP * 0.42;
const hMarkY = CAP * 0.05 - hMarkH;
const horizontal = {
  viewBox: `0 ${f(hMarkY)} ${f(hMarkW + hGap + (word.x2 - word.x1))} ${f(hMarkH)}`,
  mark: `translate(0 ${f(hMarkY)}) scale(${hScale.toFixed(5)})`,
  word: `translate(${f(hMarkW + hGap - word.x1)} 0)`,
};
horizontal.aspect = +(+horizontal.viewBox.split(" ")[2] / hMarkH).toFixed(4);

// Stacked: the mark above, the name, then the tagline. Everything centred on one axis.
const sWordW = word.x2 - word.x1, sTagW = tag.x2 - tag.x1;
const sW = Math.max(sWordW, sTagW);
const sMarkH = CAP * 3.5, sScale = sMarkH / MARK.h, sMarkW = MARK.w * sScale;
const sWordBase = sMarkH + CAP * 0.7 + CAP;
const sTagBase = sWordBase + CAP * 0.85;
const stacked = {
  viewBox: `0 0 ${f(sW)} ${f(sTagBase + 2)}`,
  mark: `translate(${f((sW - sMarkW) / 2)} 0) scale(${sScale.toFixed(5)})`,
  word: `translate(${f((sW - sWordW) / 2 - word.x1)} ${f(sWordBase)})`,
  tag: `translate(${f((sW - sTagW) / 2 - tag.x1)} ${f(sTagBase)})`,
};
stacked.aspect = +(sW / (sTagBase + 2)).toFixed(4);

const GOLD = "#B8913F", INK = "#14110D", WHITE = "#FFFFFF", GOLD_AMP = "#C9A24B";
const gradient = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EDD79C"/><stop offset=".5" stop-color="#C9A24B"/><stop offset="1" stop-color="#9A772B"/></linearGradient></defs>`;
const wrap = (vb, body, defs = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="AK&amp;VEN">${defs}${body}</svg>\n`;
/** The ampersand is gold on the ink and white versions; on the gold ones it is the same gold. */
const ampFill = (fill) => (fill === INK || fill === WHITE ? GOLD_AMP : fill);
const files = {
  logo: (fill, id) => wrap(horizontal.viewBox,
    `<g transform="${horizontal.mark}">${markMarkup(fill, id)}</g><path transform="${horizontal.word}" fill="${fill}" d="${word.d}"/><path transform="${horizontal.word}" fill="${ampFill(fill)}" d="${amp.d}"/>`),
  "logo-stacked": (fill, id) => wrap(stacked.viewBox,
    `<g transform="${stacked.mark}">${markMarkup(fill, id)}</g><path transform="${stacked.word}" fill="${fill}" d="${word.d}"/><path transform="${stacked.word}" fill="${ampFill(fill)}" d="${amp.d}"/><path transform="${stacked.tag}" fill="${fill}" d="${tag.d}"/>`),
  mark: (fill, id) => wrap(MARK.viewBox, markMarkup(fill, id)),
};
const out = path.join(root, "public/brand");
fs.mkdirSync(out, { recursive: true });
for (const old of fs.readdirSync(out)) fs.rmSync(path.join(out, old));
for (const [name, make] of Object.entries(files)) {
  fs.writeFileSync(path.join(out, `${name}-gold.svg`), make(GOLD, "a"));
  fs.writeFileSync(path.join(out, `${name}-ink.svg`), make(INK, "a"));
  fs.writeFileSync(path.join(out, `${name}-white.svg`), make(WHITE, "a"));
  fs.writeFileSync(path.join(out, `${name}-gold-metallic.svg`), make("url(#g)", "a").replace('role="img" aria-label="AK&amp;VEN">', `role="img" aria-label="AK&amp;VEN">${gradient}`));
}

fs.writeFileSync(path.join(root, "src/brand/logo.generated.ts"),
`// GENERATED by scripts/generate-logo.mjs. Do not edit by hand; run \`npm run logo\`.
export const LOGO = {
  word: ${JSON.stringify(word.d)},
  amp: ${JSON.stringify(amp.d)},
  parts: ${JSON.stringify(parts)},
  tag: ${JSON.stringify(tag.d)},
  horizontal: ${JSON.stringify(horizontal)},
  stacked: ${JSON.stringify(stacked)},
} as const;
`);
console.log("logo written: horizontal", horizontal.viewBox, "stacked", stacked.viewBox);
