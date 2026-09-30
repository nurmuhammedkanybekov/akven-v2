/**
 * Generates calm, flat product illustrations for the demo catalog: public/media/products/<slug>-1.svg.
 * Placeholders until real photography exists, but consistent and on-brand: soft tinted backdrop,
 * a sock drawn per cut (crew, ankle, no-show, knee-high), accent details by occasion, and a
 * whisper of the Ak&Ven mark in the corner. Deterministic: same input, same files.
 * Run: npm run art
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mark = JSON.parse(fs.readFileSync(path.join(root, "brand/mark-path.json"), "utf8"));

const LEG = { CREW: 330, ANKLE: 190, NO_SHOW: 70, KNEE_HIGH: 520 };
const FOOT_H = 120;

/** One sock in local coordinates: cuff top-left at (0,0), toe pointing right. */
function sock(id, { cut, main, accent, pattern }) {
  const L = LEG[cut];
  const outline = `M0 0H150V${L}H250C315 ${L} 335 ${L + 30} 335 ${L + 65}C335 ${L + 103} 302 ${L + FOOT_H} 255 ${L + FOOT_H}H42C12 ${L + FOOT_H} 0 ${L + 95} 0 ${L + 68}Z`;
  const ribLines = Array.from({ length: 9 }, (_, i) => `<path d="M${8 + i * 17} 4V30" stroke="#000" stroke-opacity=".10" stroke-width="2"/>`).join("");
  let detail = "";
  if (pattern === "sport") detail = `<rect x="0" y="52" width="150" height="9" fill="${accent}"/><rect x="0" y="72" width="150" height="9" fill="${accent}"/>`;
  if (pattern === "thermal") detail = Array.from({ length: Math.floor((L - 50) / 15) }, (_, i) => `<path d="M0 ${52 + i * 15}H150" stroke="#000" stroke-opacity=".12" stroke-width="3"/>`).join("");
  if (pattern === "dress") detail = Array.from({ length: 9 }, (_, i) => `<path d="M${10 + i * 16} 40V${L}" stroke="${accent}" stroke-opacity=".5" stroke-width="1.5"/>`).join("");
  if (pattern === "kids") detail = [90, 130, 170].filter((y) => y < L - 20).map((y, i) => `<rect x="0" y="${y}" width="150" height="14" fill="${i % 2 ? main : accent}"/>`).join("");
  return `
  <defs>
    <clipPath id="c-${id}"><path d="${outline}"/></clipPath>
    <linearGradient id="s-${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient>
  </defs>
  <path d="${outline}" fill="${main}"/>
  <g clip-path="url(#c-${id})">
    ${detail}
    <rect x="0" y="0" width="150" height="34" fill="#000" fill-opacity=".10"/>${ribLines}
    <rect x="0" y="${L + 12}" width="62" height="${FOOT_H}" rx="26" fill="${accent}" fill-opacity=".9"/>
    <rect x="262" y="${L - 6}" width="90" height="${FOOT_H + 12}" rx="30" fill="${accent}" fill-opacity=".9"/>
    <rect x="0" y="0" width="340" height="${L + FOOT_H}" fill="url(#s-${id})"/>
  </g>`;
}

function place(inner, { x, y, scale, rotate, height }) {
  return `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">${inner}</g>`;
}

const single = (spec) => {
  const total = LEG[spec.cut] + FOOT_H;
  const scale = Math.min(1.65, 640 / total);
  const w = 335 * scale, h = total * scale;
  return [{ spec, x: 400 - w / 2 - 10, y: 500 - h / 2, scale, rotate: -4 }];
};

const PRODUCTS = {
  "wool-crew-classic":    { tint: "#efeae0", socks: single({ cut: "CREW", main: "#33302b", accent: "#8b857a", pattern: "plain" }) },
  "bamboo-no-show":       { tint: "#f3e8e3", socks: single({ cut: "NO_SHOW", main: "#f4f0e8", accent: "#d9cfc0", pattern: "plain" }) },
  "merino-dress-black":   { tint: "#ebe7df", socks: single({ cut: "CREW", main: "#1f1d1a", accent: "#c9a24b", pattern: "dress" }) },
  "sport-cushion-crew":   { tint: "#e9ebec", socks: single({ cut: "CREW", main: "#a3a7ab", accent: "#2a2723", pattern: "sport" }) },
  "thermal-knee-high":    { tint: "#ece4d8", socks: single({ cut: "KNEE_HIGH", main: "#4d4943", accent: "#b08d57", pattern: "thermal" }) },
  "cotton-ankle-daily":   { tint: "#eeebe5", socks: single({ cut: "ANKLE", main: "#f6f3ed", accent: "#b9b3a8", pattern: "plain" }) },
  "soft-cotton-ankle":    { tint: "#f1e7e0", socks: single({ cut: "ANKLE", main: "#dccbb2", accent: "#e0a7a0", pattern: "plain" }) },
  "wool-knee-high-women": { tint: "#efe8dc", socks: single({ cut: "KNEE_HIGH", main: "#eadfca", accent: "#2f2c27", pattern: "thermal" }) },
  "sport-ankle-women":    { tint: "#f3e8e6", socks: single({ cut: "ANKLE", main: "#f7f4ee", accent: "#e3a6a0", pattern: "sport" }) },
  "kids-cartoon-crew":    { tint: "#e7eef1", socks: single({ cut: "CREW", main: "#8fb8d8", accent: "#f2c75c", pattern: "kids" }) },
  "kids-sport-ankle":     { tint: "#e8eee9", socks: single({ cut: "ANKLE", main: "#f6f3ed", accent: "#7fb69b", pattern: "sport" }) },
  "bazaar-family-pack": {
    tint: "#efe9d8",
    socks: [
      { spec: { cut: "CREW", main: "#33302b", accent: "#8b857a", pattern: "plain" }, x: 92, y: 250, scale: 0.98, rotate: -8 },
      { spec: { cut: "ANKLE", main: "#dccbb2", accent: "#e0a7a0", pattern: "plain" }, x: 372, y: 450, scale: 0.98, rotate: 4 },
      { spec: { cut: "CREW", main: "#8fb8d8", accent: "#f2c75c", pattern: "kids" }, x: 250, y: 330, scale: 0.6, rotate: -2 },
    ],
  },
  "winter-warm-bundle": {
    tint: "#ece4d8",
    socks: [
      { spec: { cut: "KNEE_HIGH", main: "#4d4943", accent: "#b08d57", pattern: "thermal" }, x: 70, y: 170, scale: 0.92, rotate: -7 },
      { spec: { cut: "KNEE_HIGH", main: "#b08d57", accent: "#2f2c27", pattern: "thermal" }, x: 290, y: 190, scale: 0.92, rotate: 0 },
      { spec: { cut: "KNEE_HIGH", main: "#eadfca", accent: "#2f2c27", pattern: "thermal" }, x: 510, y: 215, scale: 0.78, rotate: 6 },
    ],
  },
};

const outDir = path.join(root, "public/media/products");
fs.mkdirSync(outDir, { recursive: true });
for (const [slug, { tint, socks }] of Object.entries(PRODUCTS)) {
  const body = socks.map((s, i) => place(sock(`${slug}-${i}`, s.spec), s)).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img">
  <rect width="800" height="1000" fill="${tint}"/>
  <ellipse cx="400" cy="892" rx="250" ry="22" fill="#000" fill-opacity=".07"/>
  ${body}
  <g transform="translate(726 930) scale(${(46 / mark.h).toFixed(4)})" fill="#c9a24b" fill-opacity=".6" fill-rule="evenodd"><path d="${mark.d}"/></g>
</svg>
`;
  fs.writeFileSync(path.join(outDir, `${slug}-1.svg`), svg);
}
console.log(`wrote ${Object.keys(PRODUCTS).length} product images to public/media/products`);
