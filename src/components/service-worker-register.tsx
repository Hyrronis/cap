"use client";

import { useEffect } from "react";

/** Enregistre le service worker (production uniquement, pour ne pas gêner le dev). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Échec silencieux : l'app fonctionne sans service worker.
    });
  }, []);
  return null;
}

/** Purge tous les caches (déconnexion, effacement des données) — docs/securite.md §5. */
export async function purgeCaches(): Promise<void> {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "purge" });
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // ignoré
  }
}
