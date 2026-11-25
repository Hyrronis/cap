"use client";

import { Compass, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GoalTodayCard } from "@/components/cap/goal-today-card";
import { MetricEntrySheet } from "@/components/cap/metric-entry-sheet";
import { Button, IconLink, LinkButton, buttonClass } from "@/components/ui/button";
import { Banner, ErrorState, IconCircle, Skeleton } from "@/components/ui/feedback";
import { AppHeader } from "@/components/ui/layout";
import { useToast } from "@/components/ui/toast";
import { addDays } from "@/lib/domain/calculs";
import type { Marker } from "@/lib/domain/types";
import { chargerExemples } from "@/lib/demo";
import { capitalize, jourDate, semaine } from "@/lib/format";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { activeGoals, isReviewDue, thisWeek, today } from "@/lib/selectors";
import { useStore } from "@/lib/store";

function greeting(name: string): string {
  const h = new Date().getHours();
  const base = h >= 5 && h < 12 ? "Bonjour" : h >= 12 && h < 18 ? "Bon après-midi" : "Bonsoir";
  return name ? `${base} ${name}` : base;
}

export default function AujourdhuiPage() {
  const { data, status, reload, run } = useStore();
  const prefs = usePrefs();
  const toast = useToast();
  const [noting, setNoting] = useState<Marker | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [hello, setHello] = useState("Bonjour");
  const [subtitle, setSubtitle] = useState("");
  const goals = activeGoals(data);
  const due = goals.some((g) => isReviewDue(data, g.id, prefs.reviewDay));
  const bannerHidden = prefs.reviewBannerHiddenUntil != null && prefs.reviewBannerHiddenUntil > today();

  useEffect(() => {
    document.title = "Aujourd'hui · Cap";
    // Heure et date lues côté client seulement (pas de décalage d'hydratation).
    setHello(greeting(prefs.firstName));
    setSubtitle(`${capitalize(jourDate(new Date()))} · semaine ${semaine(thisWeek())}`);
  }, [prefs.firstName]);

  const loadDemo = async () => {
    setLoadingDemo(true);
    try {
      await run((r) => chargerExemples(r));
      toast("Exemples chargés. Fais comme chez toi.", { tone: "success" });
    } catch {
      toast("On n'a pas pu charger les exemples. Réessaie.", { tone: "attention" });
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <>
      <AppHeader title={hello} subtitle={subtitle || " "} actions={<IconLink href="/reglages" label="Réglages"><Settings size={24} aria-hidden="true" /></IconLink>} />

      {prefs.ready && prefs.localMode && !prefs.sharedDeviceNoticeSeen && (
        <div className="mb-3">
          <Banner tone="info" text="Tes données restent sur cet appareil, dans ce navigateur. Toute personne qui l'utilise peut les voir.">
            <Button size="sm" variant="secondary" onClick={() => setPrefs({ sharedDeviceNoticeSeen: true })}>
              J&apos;ai compris
            </Button>
            <Link href="/reglages#mes-donnees" className="inline-flex min-h-11 items-center px-2 text-small font-semibold text-primary underline">
              Effacer mes données de cet appareil
            </Link>
          </Banner>
        </div>
      )}

      {status === "loading" && (
        <div aria-busy="true" className="space-y-3">
          <Skeleton />
          <Skeleton />
        </div>
      )}
      {status === "error" && <ErrorState title="On n'arrive pas à afficher ta journée." onRetry={reload} />}

      {status === "ready" && goals.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <IconCircle icon={Compass} />
          <h2 className="text-title">Par quoi tu veux commencer ?</h2>
          <p className="text-body text-ink-muted">Un objectif, quelques petites actions par semaine, et on fait le point ensemble chaque semaine.</p>
          <LinkButton href="/objectifs/nouveau" variant="primary" fullWidth>
            Créer mon premier objectif
          </LinkButton>
          <Button variant="ghost" fullWidth loading={loadingDemo} loadingLabel="Chargement…" onClick={loadDemo}>
            Essayer avec des exemples
          </Button>
        </div>
      )}

      {status === "ready" && goals.length > 0 && (
        <div className="space-y-3">
          {due && !bannerHidden && (
            <Banner tone="attention" title="C'est l'heure de ton bilan" text="5 minutes pour voir où tu en es et ajuster ta semaine.">
              <Link href="/bilan" className={buttonClass("primary", "sm")}>
                Faire mon bilan
              </Link>
              <button
                type="button"
                className="min-h-11 px-3 text-small font-semibold text-primary"
                onClick={() => setPrefs({ reviewBannerHiddenUntil: addDays(today(), 1) })}
              >
                Plus tard
              </button>
            </Banner>
          )}
          {goals.map((g) => (
            <GoalTodayCard key={g.id} goal={g} onNote={setNoting} />
          ))}
          {goals.length < 3 && (
            <LinkButton href="/objectifs/nouveau" variant="secondary" fullWidth iconLeft={<Plus size={20} aria-hidden="true" />}>
              Nouvel objectif
            </LinkButton>
          )}
        </div>
      )}
      <MetricEntrySheet marker={noting} onClose={() => setNoting(null)} />
    </>
  );
}
