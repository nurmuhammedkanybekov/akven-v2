/**
 * Renders the PWA / favicon PNGs from the vector mark: metallic gold heart on ink.
 * "maskable" icons keep the mark inside the central safe zone so Android can crop them to any shape.
 * Run: npm run icons
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mark = JSON.parse(fs.readFileSync(path.join(root, "brand/mark-path.json"), "utf8"));
const INK = "#100e0b";

const svg = (size, fraction) => {
  const h = size * fraction, w = h * (mark.w / mark.h);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ebd596"/><stop offset=".5" stop-color="#c9a24b"/><stop offset="1" stop-color="#9c7a2d"/></linearGradient></defs>
    <rect width="${size}" height="${size}" fill="${INK}"/>
    <g transform="translate(${(size - w) / 2} ${(size - h) / 2 + size * 0.01}) scale(${h / mark.h})" fill="url(#g)" fill-rule="evenodd"><path d="${mark.d}"/></g></svg>`;
};

const targets = [
  ["icon-192.png", 192, 0.62], ["icon-512.png", 512, 0.62],
  ["icon-192-maskable.png", 192, 0.46], ["icon-512-maskable.png", 512, 0.46],
  ["favicon-32.png", 32, 0.78],
];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const page = await browser.newPage();
for (const [file, size, fraction] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${svg(size, fraction)}</body>`);
  await page.screenshot({ path: path.join(root, "public/icons", file), clip: { x: 0, y: 0, width: size, height: size } });
}
await browser.close();
console.log("icons written");
