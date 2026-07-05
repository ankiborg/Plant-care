/*
 * Minimal service worker: just enough for PWA installability plus a tiny
 * offline shell. App data stays online-only by design.
 */
const CACHE = "plant-care-shell-v1";
const SHELL = ["/", "/plants"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Network-first for navigations, falling back to the cached shell when offline.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((hit) => hit || caches.match("/"))
    )
  );
});
