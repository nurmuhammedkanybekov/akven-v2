// Offline-first PWA shell — Milestone 1 placeholder.
// Phase 1 (Sept 26 – Oct 17) fills this in with real cache-first catalog
// browsing and a queued-cart strategy for the offline cart caching item in
// the AI-first MVP scope. For now it just proves the service worker registers.

const CACHE_NAME = "akven-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// TODO Phase 1: cache-first for /api/products, network-first for /api/negotiate,
// and a queued write-behind strategy for cart actions made while offline.
