import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Reads the real tokens.css and checks every text/background pair the components use against WCAG AA
 * (4.5:1 for text, 3:1 for UI borders and large text), in both themes. If someone tweaks a colour
 * and makes it unreadable, this fails instead of a customer finding out.
 */
const css = readFileSync(resolve(__dirname, "../styles/tokens.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector + " {");
  const end = css.indexOf("\n}", start);
  const vars: Record<string, string> = {};
  for (const m of css.slice(start, end).matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) vars[m[1]] = m[2];
  return vars;
}

const light = block(":root");
const dark = { ...light, ...block(':root[data-theme="dark"]') };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground token, background token, minimum ratio, what it is]
const PAIRS: Array<[string, string, number, string]> = [
  ["ink", "paper", 7, "body text on page"],
  ["ink", "surface", 7, "text on cards"],
  ["ink", "surface-2", 7, "text on tinted blocks"],
  ["ink-2", "paper", 4.5, "secondary text"],
  ["ink-2", "surface", 4.5, "secondary text on cards"],
  ["ink-3", "paper", 4.5, "tertiary text and placeholders"],
  ["ink-3", "surface", 4.5, "placeholders in inputs"],
  ["ink-3", "surface-2", 4.5, "tertiary text on tinted blocks"],
  ["on-ink", "ink", 7, "primary button label"],
  ["on-accent", "accent", 7, "accent button label"],
  ["accent-ink", "paper", 4.5, "saffron text on page"],
  ["accent-ink", "surface", 4.5, "saffron text on cards"],
  ["success", "success-bg", 4.5, "success message"],
  ["danger", "danger-bg", 4.5, "error message"],
  ["ai", "ai-bg", 4.5, "negotiator proposal"],
  ["validated", "validated-bg", 4.5, "validated price"],
  ["danger", "surface", 4.5, "field error text"],
  ["on-black", "black", 7, "text on always-dark banners"],
  ["on-black-2", "black", 4.5, "secondary text on always-dark banners"],
  ["accent", "black", 4.5, "gold on always-dark banners"],
  ["line-strong", "paper", 1.4, "input border (decorative edge; fields also have a label and focus ring)"],
  ["focus", "paper", 3, "focus ring"],
  ["focus", "surface", 3, "focus ring on cards"],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("WCAG contrast, %s theme", (_name, theme) => {
  it.each(PAIRS)("%s on %s is at least %d:1 (%s)", (fg, bg, min) => {
    expect(theme[fg], `missing token --${fg}`).toBeDefined();
    expect(theme[bg], `missing token --${bg}`).toBeDefined();
    expect(ratio(theme[fg], theme[bg])).toBeGreaterThanOrEqual(min);
  });
});
