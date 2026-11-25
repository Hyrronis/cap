"use client";

import { useEffect } from "react";

/** Enregistre le service worker (production uniquement, pour ne pas gêner le dev). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err: unknown) => {
      console.warn("[Cap] Échec de l'enregistrement du service worker", err);
    });
  }, []);
  return null;
}
