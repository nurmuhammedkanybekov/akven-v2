import { useSyncExternalStore } from "react";
import type { SavedItem } from "./useSaved";

/** The last few products this visitor opened, newest first, kept in this browser only. */
const KEY = "akven-viewed";
const MAX = 12;
const listeners = new Set<() => void>();
let cache: SavedItem[] | null = null;

function read(): SavedItem[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    // Only well-formed entries: a path-safe slug, a name, and a picture from the shop's own media folder.
    cache = Array.isArray(raw) ? raw.filter((x) => x && typeof x.slug === "string" && /^[a-z0-9-]{1,120}$/.test(x.slug)
      && typeof x.name === "string" && (x.image == null || (typeof x.image === "string" && /^\/media\/[\w./-]+$/.test(x.image)))).slice(0, MAX) : [];
  } catch {
    cache = [];
  }
  return cache;
}

export function rememberViewed(item: SavedItem) {
  const next = [item, ...read().filter((i) => i.slug !== item.slug)].slice(0, MAX);
  if (read()[0]?.slug === item.slug && read()[0]?.name === item.name) return;
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}

/** Forgets what this visitor looked at. */
export function forgetViewed() {
  cache = [];
  try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}

export function useViewed(): SavedItem[] {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, read, () => []);
}
