/**
 * End-to-end check of the owner's workflow in a real browser against the real stack (Postgres + Spring + built frontend):
 * sign in, add a section, add a product with two colours, upload a photo, see it in the shop, remove it, put it back.
 * Also writes screenshots of each step to docs/design/ (thesis figures).
 *
 * Set E2E_SLOW=1 to simulate a slow machine.
 * Needs: the backend on :8080 (demo profile, fresh database, CORS_ALLOWED_ORIGINS including http://localhost:4173) and
 * `npm run build` done. Run: npm run e2e
 */
import { launchBrowser } from "./browser.mjs";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shots = path.resolve(root, "../docs/design");
const BASE = "http://localhost:4173";
const stamp = Date.now().toString(36);
const SECTION = `Premium Gold ${stamp}`;
const PRODUCT = `Ak&Ven Mid-Long Socks ${stamp}`;

const server = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { cwd: root, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, colorScheme: "light" });
const page = await ctx.newPage();
// E2E_SLOW=1 makes the browser 4 times slower, which is how a busy CI machine behaves. Steps that only pass on a fast
// machine (typing before the page has switched) show up immediately.
if (process.env.E2E_SLOW) await (await ctx.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.E2E_SLOW) || 4 });
const problems = [];
const failedCalls = [];
page.on("response", (r) => { if (r.status() >= 400) failedCalls.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, "")}`); });
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error" && !/status of 40[0-9]/.test(m.text())) problems.push(`console: ${m.text()}`); });

let productUrl = "";
const CUSTOMER = `customer-${stamp}@akven.test`;
const step = async (name, fn) => { process.stdout.write(`- ${name} ... `); await fn(); console.log("ok"); };
const axeSource = fs.readFileSync(path.join(root, "node_modules/axe-core/axe.min.js"), "utf8");
/** Runs the axe accessibility rules on the page as it is now; serious or critical findings fail the run. */
const a11y = async (label) => {
  await page.evaluate(axeSource);
  const bad = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`));
  assert.deepEqual(bad, [], `accessibility problems on ${label}:\n${bad.join("\n")}`);
};
const shot = (name, opts = {}) => page.screenshot({ path: path.join(shots, `${name}.png`), ...opts });

try {
  // a tiny real PNG photo, drawn by the browser itself
  const photo = path.join(os.tmpdir(), `akven-e2e-${stamp}.png`);
  const p2 = await ctx.newPage();
  await p2.setViewportSize({ width: 600, height: 750 });
  await p2.setContent(`<body style="margin:0;background:linear-gradient(160deg,#efe9d8,#c9a24b);display:grid;place-items:center;height:750px;font:700 64px Georgia">Mid-Long</body>`);
  await p2.screenshot({ path: photo }); await p2.close();

  await step("anonymous visitors are sent to sign in", async () => {
    await page.goto(`${BASE}/admin`);
    await page.waitForURL(/\/login\?next=%2Fadmin/);
  });
  await step("wrong password is refused with a clear message", async () => {
    await page.getByLabel("Email").fill("admin@akven.test");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByText("That email and password do not match.").waitFor();
  });
  await step("the admin signs in and lands on the product list", async () => {
    await page.getByLabel("Password").fill("changeme-admin");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`${BASE}/admin`);
    await page.getByRole("heading", { name: "Products" }).waitFor();
    await page.getByText("Merino Dress Sock").first().waitFor();
    await shot("admin-products", { fullPage: false });
  });

  await step("a new section is added and appears in the list", async () => {
    await page.getByRole("link", { name: "Sections and cuts" }).click();
    await page.getByRole("button", { name: "Add a section" }).first().click();
    await page.getByLabel("Name", { exact: true }).fill(SECTION);
    await page.getByRole("button", { name: "Add section" }).click();
    await page.locator(".av-term strong", { hasText: SECTION }).waitFor();
    await shot("admin-sections");
  });

  await step("a product is added with two colours, sizes and prices", async () => {
    await page.getByRole("link", { name: "Products" }).click();
    await page.getByRole("link", { name: "Add a product" }).first().click();
    // Wait for the editor itself: on a slow machine the list page is still showing, and its "Search by name" box
    // would also match a loose "Name" label.
    await page.getByRole("heading", { name: "Add a product" }).waitFor();
    await page.getByLabel("Name", { exact: true }).fill(PRODUCT);
    await page.getByRole("button", { name: "Women" }).click();
    await page.getByLabel("Section").selectOption({ label: SECTION });
    await page.getByLabel("Cut").selectOption({ label: "Mid-long" });
    await page.getByLabel("Quality").fill("Premium combed cotton");
    await page.getByLabel("Fabric").fill("80% cotton, 18% nylon, 2% elastane");
    await page.getByLabel("Care").fill("Machine wash cold.");
    await page.getByLabel("Description").fill("Longer than crew, softer than you expect.");

    const fillOption = async (n, colour, size, price, stock) => {
      const box = page.locator(".av-draft").nth(n);
      await box.getByRole("button", { name: colour, exact: true }).click();
      await box.getByLabel("Size").fill(size);
      await box.getByLabel("Price").fill(price);
      await box.getByLabel("In stock").fill(stock);
      await box.getByLabel("Your cost").fill("4");
    };
    await fillOption(0, "Navy", "M", "9.5", "20");
    await page.getByRole("button", { name: "+ Add another colour or size" }).click();
    await fillOption(1, "Cream", "L", "9.5", "3");
    await shot("admin-product-new", { fullPage: true });
    await a11y("the product editor");
    await page.getByRole("button", { name: "Add product" }).click();
    await page.waitForURL(/\/admin\/products\/[0-9a-f-]{36}/);
    await page.getByRole("heading", { name: PRODUCT }).waitFor();
    await page.getByText("Navy").first().waitFor();
    await page.getByText("Cream").first().waitFor();
  });

  await step("adding an option whose suggested code is already taken just works (the code gets a number)", async () => {
    const box = page.locator(".av-draft").last();
    await box.getByRole("button", { name: "Navy", exact: true }).click();
    await box.getByLabel("Size").fill("M");            // same colour, size and pack as the first option: same suggested code
    await box.getByLabel("Price").fill("9.5");
    await box.getByLabel("Your cost").fill("4");
    await page.getByRole("button", { name: "Add this option" }).click();
    await page.getByText("Added", { exact: true }).waitFor();
    await page.locator(".av-variantcard").nth(2).waitFor();   // a third option exists: nothing was rejected
    assert.equal(await page.locator(".av-variantcard").count(), 3);
  });

  await step("a photo is uploaded and becomes the cover", async () => {
    await page.getByLabel("Choose photos to upload").setInputFiles(photo);
    await page.locator(".av-photo .av-badge", { hasText: "Cover" }).waitFor();
    const src = await page.locator(".av-photo img").first().getAttribute("src");
    assert.match(src, /^\/media\/uploads\/[0-9a-f-]{36}\.png$/);
    const res = await page.request.get(BASE + src);
    assert.equal(res.status(), 200);
    assert.equal(res.headers()["content-type"], "image/png");
  });
  await step("an unsupported file is refused with a readable reason", async () => {
    const bad = path.join(os.tmpdir(), `notes-${stamp}.png`);
    fs.writeFileSync(bad, "<script>alert(1)</script>");
    await page.getByLabel("Choose photos to upload").setInputFiles(bad);
    await page.getByText("Only JPEG, PNG and WebP photos are accepted.").waitFor();
    await shot("admin-product-edit", { fullPage: true });
  });

  await step("the product shows up in the shop with its photo, swatches and a live filter count", async () => {
    await page.goto(`${BASE}/women`);
    await page.getByRole("button", { name: new RegExp(`^${SECTION}`) }).waitFor();
    await page.getByRole("button", { name: new RegExp(`^${SECTION}`) }).click();
    const card = page.getByRole("link", { name: new RegExp(PRODUCT.replace("&", "&")) });
    await card.waitFor();
    assert.match(await card.locator("img").first().getAttribute("src"), /^\/media\/uploads\//);
    assert.equal(await card.locator(".av-dots .av-dot").count(), 2);
    await shot("shop-catalog-filtered");
    await card.click();
    await page.getByRole("heading", { name: PRODUCT }).waitFor();
    productUrl = page.url();
    await page.getByRole("button", { name: "Cream" }).click();
    await page.getByRole("button", { name: "L", exact: true }).waitFor();
    await page.getByText("Only 3 left").waitFor();
    await shot("shop-product", { fullPage: false });
  });

  await step("removing the product hides it from the shop at once, and restoring brings it back", async () => {
    await page.goto(`${BASE}/admin`);
    await page.getByLabel("Search by name").fill(stamp);
    await page.getByRole("link", { name: new RegExp(PRODUCT) }).click();
    await page.getByRole("button", { name: "Remove from the shop" }).click();
    await page.getByRole("button", { name: "Remove it" }).click();
    await page.getByText("This product is hidden from the shop.").waitFor();
    await page.goto(productUrl);
    await page.getByText("That product is not here").waitFor();
    await page.goBack();
    await page.getByRole("button", { name: "Put back in the shop" }).click();
    await page.getByRole("button", { name: "Remove from the shop" }).waitFor();
    await page.goto(productUrl);
    await page.getByRole("heading", { name: PRODUCT }).waitFor();
  });

  await step("a section that products use cannot be deleted; an unused one can", async () => {
    await page.goto(`${BASE}/admin/sections`);
    await page.getByRole("button", { name: `Delete ${SECTION}` }).click();
    await page.getByText(/1 product uses/).waitFor();
    await page.getByRole("button", { name: "Keep it" }).click();
  });

  await step("the admin can sign out, and the admin is closed again", async () => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.goto(`${BASE}/admin`);
    await page.waitForURL(/\/login/);
  });


  // ---------------------------------------------------------------- the customer's journey
  await step("the public pages pass the accessibility rules", async () => {
    for (const [url, heading] of [["/", null], ["/shop", null], ["/login", "Sign in"]]) {
      await page.goto(`${BASE}${url}`);
      if (heading) await page.getByRole("heading", { name: heading }).waitFor();
      else await page.locator("main h1, main h2").first().waitFor();
      await a11y(url);
    }
  });
  await step("a visitor puts 2 pairs in the bag from the product page", async () => {
    await page.goto(productUrl);
    await page.getByRole("button", { name: "Cream" }).click();
    await page.getByRole("button", { name: "L", exact: true }).click();
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByText("Added to your bag").waitFor();
    await page.getByRole("link", { name: /Bag, 2 items/ }).waitFor();
  });
  await step("the bag shows today's price and a visitor must sign in to check out; registering brings them back", async () => {
    await page.getByRole("link", { name: /Bag, 2 items/ }).click();
    await page.getByRole("heading", { name: "Bag (2)" }).waitFor();
    await page.getByText("$19.00").first().waitFor();
    await shot("shop-cart");
    await a11y("the bag");
    await page.getByRole("link", { name: "Check out" }).click();
    await page.waitForURL(/\/login\?next=%2Fcheckout/);
    await page.getByRole("link", { name: "Create an account" }).click();
    await page.getByRole("heading", { name: "Create an account" }).waitFor();
    await page.getByLabel("Email").fill(CUSTOMER);
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(`${BASE}/checkout`);
  });
  await step("checkout asks for what it needs, and a declined payment keeps the bag", async () => {
    await page.getByRole("button", { name: "Pay with Apple Pay" }).click();
    await page.getByText("Tell us who to ask for.").waitFor();
    await page.getByLabel("Name", { exact: true }).fill("Aida Test");
    await page.getByLabel("Phone").fill("+996 700 123 456");
    await page.getByRole("radio", { name: /Delivery/ }).check();
    await page.getByRole("button", { name: "Pay with Apple Pay" }).click();
    await page.getByText("Enter the delivery address, or choose pickup.").waitFor();
    await page.getByRole("radio", { name: /Pick up/ }).check();
    await page.getByRole("button", { name: "Pay with Apple Pay" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByText("This is a demonstration wallet").waitFor();
    await shot("shop-checkout");
    await sheet.getByText("Demo: make the bank decline this payment").click();   // click it like a person: the visible label
    await sheet.getByRole("button", { name: "Pay $19.00" }).click();
    await page.getByText(/bank declined the payment/).waitFor();
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem("akven-cart-v1")));
    assert.equal(saved.length, 1);                                   // the declined payment did not cost the customer their bag
    assert.equal(saved[0].quantity, 2);
  });
  await step("paying with a working wallet creates a paid order and the stock drops", async () => {
    await page.getByRole("button", { name: "Pay with Apple Pay" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Pay $19.00" }).click();
    await page.waitForURL(/\/orders\/[0-9a-f-]{36}/);
    await page.getByText(/Thank you! Your order AV-[0-9A-F]{8} is paid/).waitFor();
    await page.getByText("Paid", { exact: true }).first().waitFor();
    await shot("shop-order");
    await page.goto(productUrl);
    await page.getByRole("button", { name: "Cream" }).click();
    await page.getByText("Only 1 left").waitFor();              // 3 in stock, 2 sold
  });
  await step("the last pair can be bought, then cancelling returns it to the shelf", async () => {
    await page.getByRole("button", { name: "Add to bag" }).click();
    await page.getByRole("link", { name: /Bag, 1 items/ }).click();
    await page.getByRole("link", { name: "Check out" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Aida Test");
    await page.getByLabel("Phone").fill("+996 700 123 456");
    await page.getByRole("button", { name: "Pay with Google Pay" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^Pay \$/ }).click();
    await page.waitForURL(/\/orders\/[0-9a-f-]{36}/);
    await page.goto(productUrl);
    await page.getByRole("button", { name: "Cream" }).click();
    await page.getByText("Sold out", { exact: true }).first().waitFor();
    await page.getByRole("link", { name: /Your orders/ }).click();
    await page.getByRole("link", { name: /AV-/ }).first().click();       // the newest order (1 pair)
    await page.getByRole("button", { name: "Cancel this order" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel the order" }).click();
    await page.getByText("Cancelled", { exact: true }).first().waitFor();
    await page.goto(productUrl);
    await page.getByRole("button", { name: "Cream" }).click();
    await page.getByText("Only 1 left").waitFor();              // the cancelled pair is back
  });
  await step("the customer haggles for 90% off, is capped by the policy, and the bag holds the capped price", async () => {
    await page.goto(productUrl);
    await page.getByRole("button", { name: "Navy" }).click();
    await page.getByLabel("Your message").fill("Give me 90% off please");
    await page.getByRole("button", { name: "Send" }).click();
    await page.getByText(/That is the best I can do|I cannot go below/).waitFor();
    const offerText = await page.getByLabel("Your offer").textContent();
    const pct = Number(/−(\d+(?:\.\d+)?)%/.exec(offerText)?.[1]);
    assert.ok(pct > 0 && pct < 90, `the offer must be capped well below 90%, got ${offerText}`);
    await shot("shop-negotiation");
    await a11y("the product page with the chat");
    await page.getByRole("button", { name: /^Add 1 pair at this price/ }).click();
    await page.getByText(/Added at .* off/).waitFor();
    await page.getByRole("link", { name: /Bag, 1 items/ }).click();
    await page.getByRole("heading", { name: "Bag (1)" }).waitFor();
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem("akven-cart-v1")));
    assert.ok(saved[0].negotiationSessionId, "the line carries the offer");
    assert.ok(saved[0].unitPrice < 9.5, "the price is below list");
    assert.ok(saved[0].unitPrice > 4, "and never below what it costs");
  });
  await step("the shop team sees the paid order, marks it completed, and the customer can no longer cancel it", async () => {
    await page.goto(`${BASE}/orders`);
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email").fill("staff@akven.test");
    await page.getByLabel("Password").fill("changeme-staff");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`${BASE}/admin`);
    await page.getByRole("link", { name: "Negotiations" }).click();
    await page.getByText("capped").first().waitFor();
    await page.getByRole("button", { name: "Read" }).first().click();
    await page.getByText(/Customer: Give me 90% off please/).waitFor();
    await shot("admin-negotiations");
    await a11y("admin negotiations");
    await page.getByRole("link", { name: "Orders" }).click();
    await page.getByText(CUSTOMER).first().waitFor();
    await shot("admin-orders");
    await a11y("admin orders");
    await page.getByRole("row", { name: new RegExp(CUSTOMER) }).getByRole("link").first().click();
    await page.getByRole("button", { name: "Mark as completed" }).click();
    await page.getByText("Completed", { exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Sign out" }).click();

    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email").fill(CUSTOMER);
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`${BASE}/`);
    await page.goto(`${BASE}/orders`);
    await page.getByText("Completed", { exact: true }).first().waitFor();
    await page.getByRole("link", { name: /AV-/ }).filter({ hasText: "Completed" }).first().click();
    await page.getByText("Completed", { exact: true }).first().waitFor();
    assert.equal(await page.getByRole("button", { name: "Cancel this order" }).count(), 0);
  });

  assert.deepEqual(problems, [], `the browser reported problems:\n${problems.join("\n")}`);
  console.log("\nAll steps passed. Screenshots in docs/design/.");
} catch (e) {
  await page.screenshot({ path: path.join(os.tmpdir(), "e2e-failure.png"), fullPage: true }).catch(() => {});
  if (failedCalls.length) console.error("\nFailed network calls:\n  " + failedCalls.join("\n  "));
  console.error("\nFAILED:", e.message, "\n(screenshot: " + path.join(os.tmpdir(), "e2e-failure.png") + ")");
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
}
