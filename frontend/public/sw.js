// Offline-first PWA shell.
//
// Milestone 1 scope: cache the app shell itself (this file's job) so the
// page installs and reopens offline. Phase 1 (Sept 26 – Oct 17) extends the
// fetch handler below with cache-first /api/products browsing and a
// queued-write cart strategy — the "offline cart caching" item in the
// AI-first MVP scope — without needing to touch the install/activate logic
// here again.

const CACHE_VERSION = "v1";
const SHELL_CACHE = `akven-shell-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("akven-shell-") && key !== SHELL_CACHE)
            .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache-first for the shell itself; anything else (notably /api/**) just
// goes to the network untouched until Phase 1 defines a real strategy per
// endpoint — a shell that silently served stale API data would be worse
// than no offline support at all.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isShellAsset = event.request.method === "GET"
      && url.origin === self.location.origin
      && SHELL_ASSETS.includes(url.pathname);

  if (!isShellAsset) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// TODO Phase 1: cache-first for GET /api/products (short TTL), network-first
// for POST /api/negotiate, and a queued write-behind strategy (e.g. via
// IndexedDB + Background Sync) for cart mutations made while offline.
