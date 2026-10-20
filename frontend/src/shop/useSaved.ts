import { useEffect, useSyncExternalStore } from "react";
import { getSavedRemote, mergeSaved, saveRemote, unsaveRemote } from "../api/endpoints";
import type { ProductSummary } from "../api/types";

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

function write(items: SavedItem[], send = true) {
  if (send && remote) {
    const before = new Set((cache ?? []).map((i) => i.slug)), after = new Set(items.map((i) => i.slug));
    items.filter((i) => !before.has(i.slug)).forEach((i) => void saveRemote(i.slug).catch(() => undefined));
    [...before].filter((s) => !after.has(s)).forEach((s) => void unsaveRemote(s).catch(() => undefined));
  }
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

/** While a customer is signed in, every change is also sent to the account (and a failure there keeps the local list). */
let remote = false;
const toItem = (p: ProductSummary): SavedItem => ({ slug: p.slug, name: p.name, image: p.image?.url ?? null, price: p.minPrice });

/**
 * Keeps the heart in step with the account: when a customer signs in, the browser's list is merged into the account's
 * once, and the account's list (from any device) becomes the one shown. Signing out keeps the browser's copy.
 */
export function useSavedSync(email: string | null) {
  useEffect(() => {
    remote = !!email;
    if (!email) return;
    let stop = false;
    const local = read().map((i) => i.slug);
    (local.length ? mergeSaved(local) : getSavedRemote())
      .then((list) => { if (!stop) write(list.map(toItem), false); })
      .catch(() => { /* offline or the server is busy: the browser's list stays */ });
    return () => { stop = true; };
  }, [email]);
}

export function useSaved() {
  const items = useSyncExternalStore(subscribe, read, () => []);
  return {
    items,
    has: (slug: string) => items.some((i) => i.slug === slug),
    // Each change starts from the stored list, not this render's copy, so several changes in a row all count.
    toggle: (item: SavedItem) => { const now = read(); write(now.some((i) => i.slug === item.slug) ? now.filter((i) => i.slug !== item.slug) : [item, ...now]); },
    addAll: (add: SavedItem[]) => { const now = read(); write([...add.filter((a) => !now.some((i) => i.slug === a.slug)), ...now].slice(0, 200)); },
    remove: (slug: string) => write(read().filter((i) => i.slug !== slug)),
  };
}

/** For tests: forget the in-memory copy so the next read comes from storage. */
export function resetSavedCache() { cache = null; }
