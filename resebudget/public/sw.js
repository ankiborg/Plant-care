// Service worker för Resebudget: cachar app-skalet så att appen startar utan
// nät. API-anrop rörs aldrig — offline-datat sköts av IndexedDB + outbox.
const CACHE = "resebudget-v1";
const SHELL = ["/", "/history", "/settings", "/login", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Cacha aldrig redirect-svar (t.ex. "/" → "/login" före inloggning) —
      // de går inte att servera till navigeringar senare.
      await Promise.all(
        SHELL.map(async (url) => {
          try {
            const res = await fetch(url, { redirect: "follow" });
            if (res.ok && !res.redirected) await cache.put(url, res);
          } catch {
            // offline vid install — runtime-cachen fyller på senare
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    // Nät först (färskt HTML efter deploy), cache som offline-fallback.
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected) {
            const cache = await caches.open(CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const hit = await caches.match(req);
          return hit || (await caches.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Statiska filer (hashade chunkar, typsnitt, ikoner): cache först.
  event.respondWith(
    (async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && !res.redirected) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    })(),
  );
});
