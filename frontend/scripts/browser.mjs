import { chromium } from "playwright-core";
import fs from "node:fs";

/**
 * Launches Chromium for the maintenance scripts (icons, screenshots, end-to-end run).
 * CHROMIUM_PATH wins; else the sandbox's preinstalled browser; else Playwright's own download
 * (CI runs `npx playwright-core install chromium` first).
 */
export function launchBrowser() {
  const preinstalled = "/opt/pw-browsers/chromium";
  const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync(preinstalled) ? preinstalled : undefined);
  return chromium.launch({ executablePath, args: ["--no-sandbox"] });
}
