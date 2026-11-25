/* Service worker de Cap, écrit à la main (docs/securite.md §5).
 * - Mis en cache : assets statiques hachés (/_next/static), icônes, manifeste,
 *   et la page /offline (statique, sans donnée personnelle).
 * - JAMAIS mis en cache : Supabase et toute autre origine, /api, /auth, les
 *   navigations HTML (NetworkOnly avec repli sur /offline), les requêtes non-GET,
 *   les réponses avec Set-Cookie ou Cache-Control private/no-store.
 * - Message { type: "purge" } : supprime tous les caches (déconnexion, effacement).
 */
const VERSION = "cap-v2";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/theme-init.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // La page /offline est servie en no-store par le proxy : on la stocke quand même,
      // elle ne contient aucune donnée personnelle.
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (res.ok) await cache.put(url, res);
          } catch {
            /* hors ligne à l'installation : on réessaiera */
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
      await Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "purge") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      })(),
    );
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/theme-init.js"
  );
}

function cacheable(res) {
  if (!res || !res.ok || res.type === "opaque") return false;
  if (res.headers.has("set-cookie")) return false;
  const cc = (res.headers.get("cache-control") || "").toLowerCase();
  return !cc.includes("no-store") && !cc.includes("private");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // non-GET : réseau uniquement

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase et autres origines : réseau uniquement
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname === "/sw.js") return;

  if (req.mode === "navigate") {
    // HTML : jamais en cache (il peut contenir des données de l'utilisateur).
    event.respondWith(
      fetch(req).catch(async () => (await caches.match(OFFLINE_URL)) || new Response("Tu es hors ligne.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (cacheable(res)) {
          const cache = await caches.open(STATIC_CACHE);
          cache.put(req, res.clone());
        }
        return res;
      })(),
    );
  }
});
