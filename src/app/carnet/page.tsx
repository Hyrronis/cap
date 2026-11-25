"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { SegmentedControl } from "@/components/ui/form";
import { AppHeader } from "@/components/ui/layout";
import { localDateOf } from "@/lib/domain/calculs";
import { dateAnnee } from "@/lib/format";
import { goalById } from "@/lib/selectors";
import { useStore } from "@/lib/store";

type Vue = "lecons" | "recettes";

export default function CarnetPage() {
  const { data, status, reload } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const vue: Vue = params.get("vue") === "recettes" ? "recettes" : "lecons";
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "Mon carnet · Cap";
  }, []);

  const groups = Object.values(
    data.lessons.reduce<Record<string, { goalId: string; date: string; items: string[] }>>((acc, l) => {
      const g = (acc[l.goalId] ??= { goalId: l.goalId, date: localDateOf(l.createdAt), items: [] });
      g.items.push(l.text);
      if (localDateOf(l.createdAt) > g.date) g.date = localDateOf(l.createdAt);
      return acc;
    }, {}),
  ).sort((a, b) => (a.date < b.date ? 1 : -1));
  const q = search.trim().toLowerCase();
  const shown = q ? groups.filter((g) => g.items.some((t) => t.toLowerCase().includes(q)) || (goalById(data, g.goalId)?.title ?? "").toLowerCase().includes(q)) : groups;

  return (
    <div className="space-y-4">
      <AppHeader title="Mon carnet" subtitle="Tout ce que tes objectifs t'ont appris." />
      <SegmentedControl
        asTabs
        label="Vue du carnet"
        options={[
          { value: "lecons", label: "Leçons" },
          { value: "recettes", label: "Recettes" },
        ]}
        value={vue}
        onChange={(v) => router.replace(v === "lecons" ? "/carnet" : "/carnet?vue=recettes")}
      />
      {status === "loading" && (
        <div aria-busy="true" className="space-y-3">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      )}
      {status === "error" && <ErrorState title="On n'arrive pas à ouvrir ton carnet." onRetry={reload} />}

      {status === "ready" && vue === "lecons" && (
        <div role="tabpanel" className="space-y-3">
          {groups.length >= 5 && (
            <div>
              <label htmlFor="search-lessons" className="sr-only">
                Chercher une leçon
              </label>
              <input
                id="search-lessons"
                type="search"
                placeholder="Chercher une leçon"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-md border border-border-strong bg-surface px-4 text-body"
              />
            </div>
          )}
          {groups.length === 0 && <EmptyState text="Ton carnet se remplira quand tu atteindras un objectif. Chaque leçon notée ici te servira pour la suite." />}
          <ul className="space-y-3">
            {shown.map((g) => (
              <li key={g.goalId} className="card space-y-2">
                <h2 className="text-heading">{goalById(data, g.goalId)?.title ?? "Objectif supprimé"}</h2>
                <p className="text-small text-ink-muted">{dateAnnee(g.date)}</p>
                <ol className="list-decimal space-y-1 pl-5 text-body">
                  {g.items.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === "ready" && vue === "recettes" && (
        <div role="tabpanel" className="space-y-3">
          {data.recipes.length === 0 && <EmptyState text="Pas encore de recette. Quand quelque chose marche pour toi, tu pourras le garder ici." />}
          <ul className="space-y-3">
            {data.recipes.map((r) => (
              <li key={r.id}>
                <Link href={`/carnet/recettes/${r.id}`} className="card flex items-center gap-3 hover:bg-surface-muted">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-heading">{r.title}</h2>
                    <p className="text-small text-ink-muted">
                      {r.steps.length} action{r.steps.length > 1 ? "s" : ""}
                      {r.when ? ` · ${r.when}` : ""}
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-ink-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
