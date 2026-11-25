"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TabBar } from "@/components/ui/layout";
import { usePrefs } from "@/lib/prefs";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

const OPEN_ROUTES = ["/bienvenue", "/connexion", "/offline", "/auth", "/confidentialite"];

function hasTabBar(p: string): boolean {
  if (p === "/" || p === "/objectifs" || p === "/bilan" || p === "/reglages") return true;
  if (p.startsWith("/carnet")) return true;
  const m = /^\/objectifs\/([^/]+)$/.exec(p);
  return !!m && m[1] !== "nouveau";
}

/** Gabarit commun : garde de route (premier lancement, connexion), barre d'onglets, hors ligne. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const prefs = usePrefs();
  const { repo } = useStore();
  const [online, setOnline] = useState(true);
  const open = OPEN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  useEffect(() => {
    if (!prefs.ready || open) return;
    if (!prefs.onboarded) {
      router.replace("/bienvenue");
      return;
    }
    if (repo.kind === "local") {
      if (!prefs.localMode) router.replace("/connexion");
      return;
    }
    createClient()
      ?.auth.getUser()
      .then(({ data }) => {
        if (!data.user) router.replace("/connexion");
      })
      .catch(() => {});
  }, [prefs.ready, prefs.onboarded, prefs.localMode, open, repo.kind, router]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const tabs = hasTabBar(pathname);
  return (
    <>
      <a href="#contenu" className="sr-only z-[70] rounded-md bg-surface px-4 py-3 font-semibold text-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Aller au contenu
      </a>
      {!online && repo.kind === "supabase" && (
        <div role="status" className="safe-top bg-attention-soft px-4 py-2 text-center text-small text-ink">
          Tu es hors ligne. Tes changements seront envoyés au retour du réseau.
        </div>
      )}
      <main id="contenu" className={`safe-top mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 ${tabs ? "pb-tabbar" : ""}`}>
        {children}
      </main>
      {tabs && <TabBar />}
    </>
  );
}
