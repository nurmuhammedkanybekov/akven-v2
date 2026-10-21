import type { SockSpec } from "../../brand/SockArt";

/** The drawing behind each sock product (written by scripts/generate-product-art.mjs): the sock, and per colour hex
 * the main and accent colours that change. */
export type SockSpecs = Record<string, { s: SockSpec; c: Record<string, [string, string]> }>;

let loading: Promise<SockSpecs> | null = null;

/** Loaded once, when a fitting room first opens; a failed load is tried again next time. */
export function loadSockSpecs(): Promise<SockSpecs> {
  loading ??= fetch("/media/products/specs.json")
    .then((r) => (r.ok ? (r.json() as Promise<SockSpecs>) : Promise.reject(new Error(String(r.status)))))
    .catch((e) => { loading = null; throw e; });
  return loading;
}

/** The product's sock in the given colour (its first colour when the hex is unknown). Colours are checked again
 * when the sock is drawn, so nothing from the file reaches the markup unchecked. */
export function specFor(specs: SockSpecs, slug: string, hex: string | null | undefined): SockSpec | undefined {
  const entry = specs[slug];
  if (!entry) return undefined;
  const colour = hex ? entry.c[hex.toUpperCase()] : undefined;
  return colour ? { ...entry.s, main: colour[0], accent: colour[1] } : entry.s;
}
