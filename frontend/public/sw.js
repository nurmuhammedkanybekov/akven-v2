// Offline-first PWA service worker.
//
// Strategies:
//  - Navigations: network first, fall back to the cached app shell ("/"), so the installed app opens offline.
//  - Built files with a content hash in the name (/assets/*): cache first, they never change.
//  - Pictures that can change under the same name (/media/*, /brand/*, /icons/*): answer from the cache at once and
//    refresh it in the background, so new product art or a new logo shows up on the next visit.
//  - /api/**: never touched here. A worker that silently served stale prices or stock would be worse than no
//    offline support. The offline cart is handled in the app (client-side), not by caching API responses.

const VERSION = "v4";
const SHELL_CACHE = `akven-shell-${VERSION}`;
const STATIC_CACHE = `akven-static-${VERSION}`;
const SHELL_ASSETS = ["/", "/theme-init.js", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png", "/brand/logo-gold.svg"];
const HASHED_PREFIX = "/assets/";
const REFRESHED_PREFIXES = ["/media/", "/brand/", "/icons/", "/theme-init.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith("akven-") && key !== SHELL_CACHE && key !== STATIC_CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put("/", copy));
        }
        return response;
      }).catch(() => caches.match("/"))
    );
    return;
  }

  const fetchAndStore = () => fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  });

  if (url.pathname.startsWith(HASHED_PREFIX)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetchAndStore()));
  } else if (REFRESHED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(caches.match(request).then((cached) => {
      const fresh = fetchAndStore();
      if (!cached) return fresh;
      event.waitUntil(fresh.catch(() => undefined));
      return cached;
    }));
  }
});
