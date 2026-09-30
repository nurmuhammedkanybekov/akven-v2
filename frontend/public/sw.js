// Offline-first PWA service worker.
//
// Strategies:
//  - Navigations: network first, fall back to the cached app shell ("/"), so the installed app opens offline.
//  - Static, content-addressed files (/assets/*, fonts, /media/*, /brand/*, /icons/*): cache first, filled as used.
//  - /api/**: never touched here. A worker that silently served stale prices or stock would be worse than no
//    offline support. The offline cart is handled in the app (client-side), not by caching API responses.

const VERSION = "v2";
const SHELL_CACHE = `akven-shell-${VERSION}`;
const STATIC_CACHE = `akven-static-${VERSION}`;
const SHELL_ASSETS = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png", "/brand/logo-gold.svg"];
const STATIC_PREFIXES = ["/assets/", "/media/", "/brand/", "/icons/"];

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
        const copy = response.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put("/", copy));
        return response;
      }).catch(() => caches.match("/"))
    );
    return;
  }

  if (STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});
