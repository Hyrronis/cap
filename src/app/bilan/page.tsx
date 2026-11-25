"use client";

import { Check } from "lucide-react";
import { useEffect } from "react";
import { GoalCard } from "@/components/cap/misc";
import { LinkButton } from "@/components/ui/button";
import { Badge, Banner, EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { AppHeader } from "@/components/ui/layout";
import { semaine } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { activeGoals, goalById, reviewFor, reviewWeek, thisWeek } from "@/lib/selectors";
import { useStore } from "@/lib/store";

export default function BilanHubPage() {
  const { data, status, reload } = useStore();
  const { reviewDay } = usePrefs();
  const goals = activeGoals(data);
  const rows = goals.map((g) => {
    const ws = reviewWeek(data, g.id, reviewDay);
    return { goal: g, ws, done: !!reviewFor(data, g.id, ws) };
  });
  const allDone = rows.length > 0 && rows.every((r) => r.done);
  const ws = rows[0]?.ws ?? thisWeek();

  const previous = [...new Set(data.reviews.map((r) => r.weekStart))]
    .filter((w) => w < ws)
    .sort((a, b) => (a < b ? 1 : -1));

  useEffect(() => {
    document.title = "Bilan de la semaine · Cap";
  }, []);

  return (
    <div className="space-y-4">
      <AppHeader title="Bilan de la semaine" subtitle={`Semaine ${semaine(ws)}`} />
      {status === "loading" && <Skeleton />}
      {status === "error" && <ErrorState title="On n'arrive pas à charger ta semaine." onRetry={reload} />}
      {status === "ready" && goals.length === 0 && (
        <EmptyState text="Pas encore de bilan à faire. Crée un objectif, et on fera le point ensemble en fin de semaine.">
          <LinkButton href="/objectifs/nouveau" variant="primary" fullWidth>
            Créer un objectif
          </LinkButton>
        </EmptyState>
      )}
      {allDone && <Banner tone="success" text="Tous tes bilans sont faits. Belle régularité." />}
      <ul className="space-y-3">
        {rows.map(({ goal, ws: w, done }) => (
          <li key={goal.id}>
            <GoalCard
              goal={goal}
              href={`/bilan/${goal.id}${w !== thisWeek() ? `?semaine=${w}` : ""}`}
              right={done ? <Badge tone="success" icon={Check}>Fait</Badge> : <Badge tone="attention">À faire</Badge>}
            />
          </li>
        ))}
      </ul>

      {previous.length > 0 && (
        <section aria-labelledby="prev-title" className="space-y-2 pt-2">
          <h2 id="prev-title" className="text-heading">
            Bilans précédents
          </h2>
          {previous.map((w) => (
            <details key={w} className="card">
              <summary className="flex min-h-11 cursor-pointer items-center text-body font-semibold">Semaine {semaine(w)}</summary>
              <ul className="space-y-2 pt-2">
                {data.reviews
                  .filter((r) => r.weekStart === w)
                  .map((r) => (
                    <li key={r.id} className="space-y-0.5 text-small">
                      <p className="font-semibold">
                        {goalById(data, r.goalId)?.title ?? "Objectif supprimé"} · {r.verdict === "progress" ? "Ça avance" : "Ça bloque"}
                      </p>
                      {r.whatIChange && <p className="text-ink-muted">Ce que je change : {r.whatIChange}</p>}
                    </li>
                  ))}
              </ul>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
