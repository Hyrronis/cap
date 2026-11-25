"use client";

import { Plus, Settings } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GoalCard } from "@/components/cap/misc";
import { Button, IconLink, LinkButton } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { SegmentedControl } from "@/components/ui/form";
import { AppHeader, StickyFooter } from "@/components/ui/layout";
import { BottomSheet } from "@/components/ui/sheet";
import type { Goal } from "@/lib/domain/types";
import { useStore } from "@/lib/store";

type Vue = "en-cours" | "atteints" | "de-cote";
const VUES = [
  { value: "en-cours", label: "En cours" },
  { value: "atteints", label: "Atteints" },
  { value: "de-cote", label: "De côté" },
] as const;

const filter: Record<Vue, (g: Goal) => boolean> = {
  "en-cours": (g) => g.status === "active",
  atteints: (g) => g.status === "achieved",
  "de-cote": (g) => g.status === "paused" || g.status === "abandoned",
};

export default function ObjectifsPage() {
  const { data, status, reload } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const vue = (VUES.find((v) => v.value === params.get("vue"))?.value ?? "en-cours") as Vue;
  const [tooMany, setTooMany] = useState(false);
  const goals = data.goals.filter(filter[vue]);
  const activeCount = data.goals.filter((g) => g.status === "active").length;

  useEffect(() => {
    document.title = "Mes objectifs · Cap";
  }, []);

  const create = () => (activeCount >= 3 ? setTooMany(true) : router.push("/objectifs/nouveau"));

  return (
    <div className="pb-20">
      <AppHeader title="Mes objectifs" actions={<IconLink href="/reglages" label="Réglages"><Settings size={24} aria-hidden="true" /></IconLink>} />
      <SegmentedControl label="Filtrer mes objectifs" options={VUES} value={vue} onChange={(v) => router.replace(v === "en-cours" ? "/objectifs" : `/objectifs?vue=${v}`)} />
      <div className="mt-4 space-y-3">
        {status === "loading" && (
          <div aria-busy="true" className="space-y-3">
            <Skeleton />
            <Skeleton />
          </div>
        )}
        {status === "error" && <ErrorState title="On n'arrive pas à afficher tes objectifs." onRetry={reload} />}
        {status === "ready" && goals.length === 0 && (
          <EmptyState
            text={
              vue === "en-cours" ? "Aucun objectif en cours." : vue === "atteints" ? "Tes objectifs atteints apparaîtront ici. Le premier arrive." : "Rien de mis de côté."
            }
          >
            {vue === "en-cours" && (
              <LinkButton href="/objectifs/nouveau" variant="primary" fullWidth>
                Créer un objectif
              </LinkButton>
            )}
          </EmptyState>
        )}
        {status === "ready" && (
          <ul className="space-y-3">
            {goals.map((g) => (
              <li key={g.id}>
                <GoalCard goal={g} href={`/objectifs/${g.id}`} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <StickyFooter withTabBar>
        <Button fullWidth onClick={create} iconLeft={<Plus size={20} aria-hidden="true" />}>
          Nouvel objectif
        </Button>
      </StickyFooter>
      <BottomSheet
        open={tooMany}
        onClose={() => setTooMany(false)}
        title="Tu as déjà 3 objectifs en cours"
        description="C'est beaucoup à mener de front. Tu peux en mettre un de côté, ou te lancer quand même."
      >
        <Button fullWidth onClick={() => router.push("/objectifs/nouveau")}>
          Continuer quand même
        </Button>
        <Button variant="secondary" fullWidth onClick={() => setTooMany(false)}>
          Voir mes objectifs
        </Button>
      </BottomSheet>
    </div>
  );
}
