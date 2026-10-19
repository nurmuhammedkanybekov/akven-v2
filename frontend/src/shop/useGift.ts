import { useSyncExternalStore } from "react";
import type { GiftBoxColour, GiftInput, GiftRibbon } from "../api/types";

/**
 * The gift box being prepared for the bag: box colour, ribbon and the card. Kept in this browser with the bag, sent
 * with the order at checkout, and forgotten once the order is placed. What is read back from storage is checked
 * field by field, so a hand-edited value can only ever be dropped, never sent.
 */
export const BOXES: GiftBoxColour[] = ["KRAFT", "NAVY", "RED"];
export const RIBBONS: GiftRibbon[] = ["GOLD", "RED", "WHITE"];
export const LIMITS = { to: 60, from: 60, message: 300 } as const;

const KEY = "akven-gift-v1";
const listeners = new Set<() => void>();
let cache: GiftInput | null | undefined;

const text = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : null);

export function parseGift(raw: unknown): GiftInput | null {
  const g = raw as Partial<GiftInput> | null;
  if (!g || !BOXES.includes(g.box as GiftBoxColour) || !RIBBONS.includes(g.ribbon as GiftRibbon)) return null;
  return { box: g.box!, ribbon: g.ribbon!, to: text(g.to, LIMITS.to), from: text(g.from, LIMITS.from),
    message: text(g.message, LIMITS.message), hidePrices: g.hidePrices === true };
}

function read(): GiftInput | null {
  if (cache !== undefined) return cache;
  try { cache = parseGift(JSON.parse(localStorage.getItem(KEY) ?? "null")); } catch { cache = null; }
  return cache;
}

export function setGift(gift: GiftInput | null) {
  cache = gift ? parseGift(gift) : null;
  try { cache ? localStorage.setItem(KEY, JSON.stringify(cache)) : localStorage.removeItem(KEY); } catch { /* kept for this visit */ }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === null) { cache = undefined; l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

/** The gift box for the bag, or null when the order is not a gift. */
export function useGift(): GiftInput | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** Trimmed, empty fields left out: what checkout sends. */
export function giftForCheckout(g: GiftInput | null): GiftInput | null {
  if (!g) return null;
  const clean = (s: string | null) => (s && s.trim() ? s.trim() : null);
  return { ...g, to: clean(g.to), from: clean(g.from), message: clean(g.message) };
}

/** For tests. */
export function resetGiftCache() { cache = undefined; }
