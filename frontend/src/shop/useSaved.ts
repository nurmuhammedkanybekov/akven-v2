import { useSyncExternalStore } from "react";

/**
 * Saved socks (the heart on a card): kept in this browser only, like the bag before checkout. Each entry keeps what
 * the card needs to draw itself, so the saved page works without asking the server for every product.
 */
export interface SavedItem { slug: string; name: string; image: string | null; price: number | null }

const KEY = "akven-saved";
const listeners = new Set<() => void>();
let cache: SavedItem[] | null = null;

function read(): SavedItem[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(raw) ? raw.filter((x) => x && typeof x.slug === "string").slice(0, 200) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: SavedItem[]) {
  cache = items;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage blocked: kept for this visit */ }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

export function useSaved() {
  const items = useSyncExternalStore(subscribe, read, () => []);
  return {
    items,
    has: (slug: string) => items.some((i) => i.slug === slug),
    toggle: (item: SavedItem) => write(items.some((i) => i.slug === item.slug) ? items.filter((i) => i.slug !== item.slug) : [item, ...items]),
    remove: (slug: string) => write(items.filter((i) => i.slug !== slug)),
  };
}

/** For tests: forget the in-memory copy so the next read comes from storage. */
export function resetSavedCache() { cache = null; }
