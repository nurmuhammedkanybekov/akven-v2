// Renders an SVG figure to PNG (2x, for slides) and PDF (vector, for the thesis) next to it, with the Chromium that
// Playwright uses. Run from the repository root: node docs/diagrams/tools/render.mjs docs/diagrams/04-er-data-model.svg
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(path.resolve("frontend/package.json"));
const { chromium } = require("playwright-core");
const svgPath = path.resolve(process.argv[2]);
const svg = fs.readFileSync(svgPath, "utf8");
const [, w, h] = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/).map(Number);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: Math.ceil(w), height: Math.ceil(h) }, deviceScaleFactor: 2 });
await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
await page.screenshot({ path: svgPath.replace(/\.svg$/, ".png"), clip: { x: 0, y: 0, width: w, height: h } });
await page.pdf({ path: svgPath.replace(/\.svg$/, ".pdf"), width: `${w}px`, height: `${h}px`, printBackground: true, pageRanges: "1" });
await browser.close();
console.log("rendered", path.basename(svgPath, ".svg"), "as PNG and PDF");
