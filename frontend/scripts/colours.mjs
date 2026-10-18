/**
 * Colour helpers shared by the image and seed scripts: the name a colour key gets in the shop, the file-name form of a
 * colour name, every product's colours (from the collections, and a snapshot for the first catalogue), and a sock
 * drawing turned to another colour.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SOCK_COLOURS as C } from "../src/brand/sockDrawing.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

/** The colour as customers read it: "Navy", "Ice blue". */
export const colourName = (key) => ({ ice: "Ice blue", ink: "Ink blue", oat: "Oatmeal" })[key] ?? key[0].toUpperCase() + key.slice(1);

/** "Ice blue" -> "ice-blue", for file names. */
export const colourSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The colours of the first catalogue's products (V2, V4, V18), as [name, hex], taken from the demo database once. */
export const LEGACY_COLOURS = JSON.parse(fs.readFileSync(path.join(here, "legacy-colours.json"), "utf8"));

/** A collection product's colours, as [name, hex], in the order its variants list them. */
export function collectionColours(product) {
  const seen = new Map();
  for (const [, key] of product.variants) if (key && !seen.has(key)) seen.set(key, [product.box ? "Mixed" : colourName(key), C[key].toUpperCase()]);
  return [...seen.values()];
}

function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lum(hex) { const [r, g, b] = rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
function mix(hex, to, t) {
  const a = rgb(hex), b = rgb(to);
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/**
 * The same sock in another colour. A one-colour sock (`solid`) gets its heel and toe in a shade of the new colour; a
 * patterned one keeps its pattern colours, unless the pattern would vanish against the new colour, then it is
 * lightened or darkened until it shows.
 */
export function colourise(spec, hex) {
  const s = { ...spec, main: hex };
  if (spec.solid) {
    s.accent = lum(hex) > 0.55 ? mix(hex, "#000000", 0.14) : mix(hex, "#ffffff", 0.16);
  } else if (Math.abs(lum(s.accent) - lum(hex)) < 0.14) {
    s.accent = lum(hex) > 0.5 ? mix(hex, "#000000", 0.45) : mix(hex, "#ffffff", 0.55);
  }
  return s;
}
