// The shop in the engines the Chromium run cannot speak for: WebKit (Safari on iPhone and Mac) and Firefox, on a
// phone-sized and a laptop-sized screen. A customer's path, in short: the home page and its fitting-room teaser, the
// fitting room, a shelf, a sock into the bag, the bag, the sign-in form's own messages, and Russian. On every page:
// no script errors and nothing wider than the screen. Needs the backend on :8080 with the demo catalogue and
// `npx playwright-core install webkit firefox` (CI does both); run with `npm run e2e:browsers`.
import { chromium, firefox, webkit } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://localhost:4173";
const server = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { cwd: root, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));

// E2E_ENGINES=chromium runs the same steps in Chromium (to check the script itself where only Chromium is installed).
const engines = process.env.E2E_ENGINES === "chromium"
  ? [["Chromium", { launch: () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] }) }]]
  : [["WebKit", webkit], ["Firefox", firefox]];
const screens = [
  { name: "phone", viewport: { width: 390, height: 844 }, mobile: true },
  { name: "laptop", viewport: { width: 1280, height: 800 }, mobile: false },
];
let failed = 0;

for (const [engineName, engine] of engines) {
  const browser = await engine.launch();
  for (const screen of screens) {
    // Firefox has no mobile emulation; it still gets the phone's width.
    const ctx = await browser.newContext({ viewport: screen.viewport, ...(screen.mobile && engineName !== "Firefox" && !process.env.E2E_NO_MOBILE ? { isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const step = async (name, fn) => {
      try { await fn(); console.log(`- ${engineName}, ${screen.name}: ${name} ... ok`); }
      catch (e) {
        failed++;
        // A picture of the moment it failed, kept by CI as an artifact (browser-failures/ is not in git).
        fs.mkdirSync(path.join(root, "browser-failures"), { recursive: true });
        await page.screenshot({ path: path.join(root, "browser-failures", `${engineName}-${screen.name}-${failed}.png`) }).catch(() => {});
        console.log(`- ${engineName}, ${screen.name}: ${name} ... FAILED\n    ${String(e.message).split("\n").slice(0, 12).join("\n    ")}`); }
    };
    const fits = async () => {
      const [inner, scroll] = await page.evaluate(() => [window.innerWidth, document.documentElement.scrollWidth]);
      assert.ok(inner === screen.viewport.width && scroll <= inner, `page is ${scroll}px wide on a ${screen.viewport.width}px screen`);
      const clipped = await page.evaluate(() => { const t = document.querySelector(".av-ann__text"); return t ? t.scrollHeight > t.clientHeight + 1 : false; });
      assert.ok(!clipped, "the top bar's message is cut off");
    };

    await step("the home page, and the fitting room's teaser leads into the room with the same choices", async () => {
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: /Socks chosen pair by pair/ }).waitFor();
      await fits();
      const teaser = page.locator("#fitting");
      // Choose like a person does, then check what the page made of it: the choice itself, then the advice it gives.
      const state = () => page.evaluate(() => ({
        who: document.querySelector("#fitting input[name=ft-who]:checked")?.closest("label")?.textContent,
        cut: document.querySelector("#fitting input[name=ft-cut]:checked")?.closest("label")?.textContent,
        advice: document.querySelector("#fitting .av-fr__advice")?.textContent,
      }));
      await teaser.scrollIntoViewIfNeeded();
      await teaser.locator("label", { hasText: /^Her$/ }).click();
      await teaser.locator("label", { hasText: /^Ankle/ }).click();
      try {
        await page.waitForFunction(() => document.querySelector("#fitting input[name=ft-cut]:checked")?.closest("label")?.textContent?.startsWith("Ankle"), null, { timeout: 5000 });
      } catch { throw new Error(`the Ankle choice did not take: ${JSON.stringify(await state())}`); }
      try { await teaser.getByText(/Ankle with sneakers/).waitFor({ timeout: 5000 }); }
      catch { throw new Error(`Ankle is chosen but the advice did not follow: ${JSON.stringify(await state())}`); }
      await teaser.getByRole("link", { name: /Open the fitting room/ }).click();
      await page.waitForURL(/\/fitting\?who=WOMEN&cut=ankle/);
      await page.getByRole("heading", { level: 1, name: "Try them on before you buy" }).waitFor();
      await fits();
    });

    await step("a shelf, then a sock into the bag", async () => {
      await page.goto(`${BASE}/women`, { waitUntil: "networkidle" });
      await page.locator(".av-grid-products .av-card").first().waitFor();
      await fits();
      if (screen.mobile) await page.locator("[data-scroll-end]").first().waitFor({ state: "attached" });
      // The filter bar sits above the socks, never over them (a stray offset once pushed it 72px down on phones).
      const [barBottom, gridTop] = await page.evaluate(() => [document.querySelector(".av-shelfbar").getBoundingClientRect().bottom, document.querySelector(".av-grid-products").getBoundingClientRect().top]);
      assert.ok(barBottom <= gridTop + 1, `the filter bar overlaps the socks by ${Math.round(barBottom - gridTop)}px`);
      // Click the sock's name: where the picture is, a pointer brings up "Quick view" (which is meant to catch the click).
      await page.locator(".av-grid-products .av-card__name").first().click();
      await page.getByRole("button", { name: /^Add to bag/ }).first().click();
      await page.getByText(/Added to your bag/).waitFor();
      await page.goto(`${BASE}/cart`, { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "Bag (1)" }).waitFor();
      await page.getByRole("button", { name: /Check out/ }).or(page.getByRole("link", { name: /Check out/ })).first().waitFor();
      await fits();
    });

    await step("the sign-in form says what is missing", async () => {
      await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.getByText("Enter your email.").waitFor();
      await page.getByText("Enter your password.").waitFor();
      await fits();
    });

    await step("Russian, from the first paint, with the shelf filter bar inside the screen", async () => {
      await page.evaluate(() => localStorage.setItem("akven-lang", "ru"));
      await page.goto(`${BASE}/men`, { waitUntil: "networkidle" });
      await page.locator("h1").first().waitFor();
      assert.match(await page.locator("h1").first().innerText(), /[А-Яа-я]/, "the shelf's title is not in Russian");
      await fits();
      await page.evaluate(() => localStorage.setItem("akven-lang", "en"));
    });

    await step("no script errors", async () => { assert.deepEqual(errors, []); });
    await ctx.close();
  }
  await browser.close();
}
server.kill();
console.log(failed ? `\n${failed} step(s) failed.` : `\nAll steps passed in ${engines.map(([n]) => n).join(" and ")}.`);
process.exit(failed ? 1 : 0);
