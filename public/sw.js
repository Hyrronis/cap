/* Service worker minimal de Cap, écrit à la main.
 * - Assets statiques (/_next/static, /icons, polices, images) : cache d'abord.
 * - Pages (navigations) : réseau d'abord, repli sur le cache si hors ligne.
 * - Requêtes non-GET, cross-origin (dont Supabase) et API : jamais mises en cache.
 */
const VERSION = "cap-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Jamais de cache hors de notre origine (Supabase, CDN…) ni pour les API / l'auth.
  if (url.origin !== self.location.origin) return;
  if (url.hostname.endsWith(".supabase.co") || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
  if (url.pathname === "/sw.js") return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          const cached = (await caches.match(req)) || (await caches.match("/"));
          return cached || new Response("Tu es hors ligne.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
      })(),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(req, res.clone());
        }
        return res;
      })(),
    );
  }
});
