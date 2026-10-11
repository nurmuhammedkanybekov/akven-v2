/**
 * Renders the PWA / favicon PNGs from the vector mark: the metallic gold AV on navy.
 * "maskable" icons keep the mark inside the central safe zone so Android can crop them to any shape.
 * Run: npm run icons
 */
import { launchBrowser } from "./browser.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
import { MARK, markMarkup } from "../src/brand/mark.ts";

const INK = "#0f1930";

const svg = (size, fraction) => {
  const w = size * fraction * 1.3, h = w * (MARK.h / MARK.w);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ebd596"/><stop offset=".5" stop-color="#c9a24b"/><stop offset="1" stop-color="#9c7a2d"/></linearGradient></defs>
    <rect width="${size}" height="${size}" fill="${INK}"/>
    <g transform="translate(${(size - w) / 2} ${(size - h) / 2}) scale(${h / MARK.h})">${markMarkup("url(#g)", "i")}</g></svg>`;
};

const targets = [
  ["icon-192.png", 192, 0.62], ["icon-512.png", 512, 0.62],
  ["icon-192-maskable.png", 192, 0.46], ["icon-512-maskable.png", 512, 0.46],
  ["favicon-32.png", 32, 0.78],
];
const browser = await launchBrowser();
const page = await browser.newPage();
for (const [file, size, fraction] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${svg(size, fraction)}</body>`);
  await page.screenshot({ path: path.join(root, "public/icons", file), clip: { x: 0, y: 0, width: size, height: size } });
}
await browser.close();
console.log("icons written");
