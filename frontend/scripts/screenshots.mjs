/**
 * Serves the production build and captures the style guide at phone, tablet and laptop widths (light and dark)
 * into docs/design/. These double as thesis figures and as a visual record of the design system.
 * Run: npm run build && npm run screenshots
 */
import { launchBrowser } from "./browser.mjs";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(root, "../docs/design");
fs.mkdirSync(out, { recursive: true });

const server = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { cwd: root, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const browser = await launchBrowser();

const shots = [
  ["styleguide-phone", 390, 844, "light"],
  ["styleguide-tablet", 820, 1180, "light"],
  ["styleguide-laptop", 1440, 900, "light"],
  ["styleguide-laptop-dark", 1440, 900, "dark"],
];
try {
  for (const [name, width, height, scheme] of shots) {
    const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // Images are lazy-loaded; force them to load, then wait until every one has finished.
    await page.evaluate(() => document.querySelectorAll("img").forEach((i) => { i.loading = "eager"; }));
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    // Regression guard: nothing may be wider than the viewport (a sideways-scrolling phone page is a bug).
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    if (scrollWidth > width) throw new Error(`${name}: page is ${scrollWidth}px wide in a ${width}px viewport`);
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
    await ctx.close();
  }
  console.log("screenshots written to docs/design");
} finally {
  await browser.close();
  server.kill();
}
