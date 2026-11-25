"use client";

import { MoreVertical, PauseCircle, Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MetricChart } from "@/components/cap/metric-chart";
import { GoalSummary, goalStatusLabel, summaryFromGoal } from "@/components/cap/misc";
import { Button, LinkButton, buttonClass } from "@/components/ui/button";
import { Badge, Banner, ErrorState, Skeleton, StatusBadge } from "@/components/ui/feedback";
import { SegmentedControl } from "@/components/ui/form";
import { AppHeader } from "@/components/ui/layout";
import { BottomSheet, ConfirmDialog } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { localDateOf } from "@/lib/domain/calculs";
import { date as fmtDate, semaine } from "@/lib/format";
import { actionsOf, digSuggestion, goalBadge, markersOf, reviewsOf, thisWeek, today, weeksLeft } from "@/lib/selectors";
import { useStore } from "@/lib/store";

export default function ObjectifPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, status, run, reload } = useStore();
  const goal = data.goals.find((g) => g.id === id);
  const [menu, setMenu] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markerId, setMarkerId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (goal) document.title = `${goal.title} · Cap`;
  }, [goal]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  if (status === "loading") return <Skeleton className="mt-16" />;
  if (status === "error") return <ErrorState title="On n'arrive pas à afficher tes objectifs." onRetry={reload} />;
  if (!goal) {
    return (
      <div className="pt-10">
        <ErrorState title="Cet objectif n'existe plus." />
        <LinkButton href="/objectifs" variant="secondary" fullWidth>
          Voir mes objectifs
        </LinkButton>
      </div>
    );
  }

  const ws = thisWeek();
  const actions = actionsOf(data, goal.id, ws);
  const markers = markersOf(data, goal.id);
  const shownMarker = markers.find((m) => m.id === markerId) ?? markers[0];
  const reviews = reviewsOf(data, goal.id);
  const analyses = data.rootCauseAnalyses.filter((a) => a.goalId === goal.id);
  const dig = digSuggestion(data, goal.id);
  const statusLabel = goalStatusLabel(goal, goalBadge(data, goal.id));
  const left = weeksLeft(goal.smart.deadline);

  const setStatus = async (s: "active" | "paused") => {
    const previous = goal.status;
    try {
      await run((r) => r.updateGoal(goal.id, { status: s }));
      if (s === "paused") {
        toast("Objectif mis de côté.", {
          action: { label: "Annuler", onClick: () => void run((r) => r.updateGoal(goal.id, { status: previous })) },
        });
      } else toast("Objectif repris.", { tone: "success" });
    } catch {
      toast("Ce n'est pas enregistré. Vérifie ta connexion et réessaie.", { tone: "attention" });
    }
  };

  const remove = async () => {
    try {
      await run((r) => r.deleteGoal(goal.id));
      toast("Objectif supprimé.");
      router.push("/objectifs");
    } catch {
      toast("Ce n'est pas enregistré. Vérifie ta connexion et réessaie.", { tone: "attention" });
    }
  };

  type Item = { kind: "review"; date: string; node: React.ReactNode } | { kind: "rca"; date: string; node: React.ReactNode };
  const history: Item[] = [
    ...reviews.map((r) => ({
      kind: "review" as const,
      date: r.weekStart,
      node: (
        <li key={r.id} className="card space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-small font-semibold">Semaine {semaine(r.weekStart)}</span>
            {r.verdict === "progress" ? <Badge tone="success" icon={TrendingUp}>Ça avance</Badge> : <Badge tone="attention" icon={PauseCircle}>Ça bloque</Badge>}
          </div>
          {r.whatIChange && <p className="text-small text-ink-muted">Ce que je change : {r.whatIChange}</p>}
        </li>
      ),
    })),
    ...analyses.map((a) => ({
      kind: "rca" as const,
      date: localDateOf(a.createdAt),
      node: (
        <li key={a.id} className="card space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-small font-semibold">Cause creusée le {fmtDate(localDateOf(a.createdAt))}</span>
            <Badge tone="primary" icon={Search}>Creusé</Badge>
          </div>
          {a.decision && <p className="text-small text-ink-muted">{a.decision}</p>}
        </li>
      ),
    })),
  ].sort((x, y) => (x.date < y.date ? 1 : -1));

  return (
    <div className="space-y-6">
      <AppHeader
        back="/objectifs"
        title={goal.title}
        actions={
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Plus d'options"
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-muted"
            >
              <MoreVertical size={24} aria-hidden="true" />
            </button>
            {menu && (
              <ul role="menu" className="shadow-float absolute right-0 z-40 mt-1 w-64 overflow-hidden rounded-md border border-border bg-surface py-1">
                <li role="none">
                  <Link role="menuitem" href={`/objectifs/${goal.id}/modifier`} className="flex min-h-11 items-center px-4 hover:bg-surface-muted">
                    Modifier l&apos;objectif
                  </Link>
                </li>
                <li role="none">
                  {goal.status === "active" ? (
                    <button role="menuitem" type="button" className="flex min-h-11 w-full items-center px-4 text-left hover:bg-surface-muted" onClick={() => (setMenu(false), setPausing(true))}>
                      Mettre de côté
                    </button>
                  ) : (
                    <button role="menuitem" type="button" className="flex min-h-11 w-full items-center px-4 text-left hover:bg-surface-muted" onClick={() => (setMenu(false), setStatus("active"))}>
                      Reprendre cet objectif
                    </button>
                  )}
                </li>
                {goal.status !== "achieved" && (
                  <li role="none">
                    <Link role="menuitem" href={`/objectifs/${goal.id}/retenir`} className="flex min-h-11 items-center px-4 hover:bg-surface-muted">
                      J&apos;ai atteint mon objectif
                    </Link>
                  </li>
                )}
                <li role="none">
                  <button role="menuitem" type="button" className="flex min-h-11 w-full items-center px-4 text-left text-danger hover:bg-surface-muted" onClick={() => (setMenu(false), setDeleting(true))}>
                    Supprimer
                  </button>
                </li>
              </ul>
            )}
          </div>
        }
      />
      <div className="-mt-4 flex flex-wrap items-center gap-2 text-small text-ink-muted">
        <StatusBadge status={statusLabel} />
        {goal.smart.deadline && (
          <span>
            Pour le {fmtDate(goal.smart.deadline)}
            {left ? ` · il reste ${left} semaine${left > 1 ? "s" : ""}` : ""}
          </span>
        )}
      </div>

      {dig.suggest && goal.status === "active" && (
        <Banner tone="attention" text="Ça coince depuis 2 semaines. Et si on cherchait pourquoi, ensemble ?">
          <Link href={`/objectifs/${goal.id}/creuser`} className={buttonClass("primary", "sm")}>
            Creuser la cause
          </Link>
        </Banner>
      )}

      <details className="card group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-heading">
          Mon objectif en entier
          <span className="text-small font-semibold text-primary group-open:hidden">Afficher</span>
          <span className="hidden text-small font-semibold text-primary group-open:inline">Masquer</span>
        </summary>
        <div className="pt-2">
          <GoalSummary input={summaryFromGoal(goal, data)} />
        </div>
      </details>

      <section aria-labelledby="plan-title" className="space-y-3">
        <h2 id="plan-title" className="text-heading">
          Mon plan de la semaine
        </h2>
        {actions.length ? (
          <ul className="card space-y-2">
            {actions.map((a) => {
              const n = data.actionLogs.filter((l) => l.actionId === a.id && l.date >= ws && l.date <= today()).length;
              return (
                <li key={a.id} className="flex justify-between gap-2 text-body">
                  <span>{a.label}</span>
                  <span className="shrink-0 text-small text-ink-muted tabular-nums">
                    {n} sur {a.targetCount}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-body text-ink-muted">Il manque ton plan de la semaine.</p>
        )}
        <LinkButton href={`/objectifs/${goal.id}/plan`} variant="secondary" fullWidth>
          Ajuster mon plan
        </LinkButton>
      </section>

      {shownMarker && (
        <section aria-labelledby="markers-title" className="space-y-3">
          <h2 id="markers-title" className="text-heading">
            Mes repères
          </h2>
          {markers.length > 1 && (
            <SegmentedControl asTabs label="Choisir un repère" options={markers.map((m) => ({ value: m.id, label: m.name }))} value={shownMarker.id} onChange={setMarkerId} />
          )}
          <div className="card">
            <MetricChart marker={shownMarker} measurements={data.measurements} refDate={today()} />
          </div>
        </section>
      )}

      <section aria-labelledby="reviews-title" className="space-y-3">
        <h2 id="reviews-title" className="text-heading">
          Mes bilans
        </h2>
        {history.length ? <ul className="space-y-2">{history.map((h) => h.node)}</ul> : <p className="text-body text-ink-muted">Pas encore de bilan. On fera le point en fin de semaine.</p>}
      </section>

      <BottomSheet open={pausing} onClose={() => setPausing(false)} title="Mettre cet objectif de côté ?" description="Il ne s'affichera plus dans ta journée. Tu pourras le reprendre quand tu veux.">
        <Button
          fullWidth
          onClick={() => {
            setPausing(false);
            void setStatus("paused");
          }}
        >
          Mettre de côté
        </Button>
        <Button variant="secondary" fullWidth onClick={() => setPausing(false)}>
          Annuler
        </Button>
      </BottomSheet>
      <ConfirmDialog
        open={deleting}
        tone="danger"
        title="Supprimer cet objectif ?"
        description="Son plan, ses repères et ses bilans seront effacés. On ne pourra pas les récupérer."
        confirmLabel="Supprimer"
        cancelLabel="Garder"
        onCancel={() => setDeleting(false)}
        onConfirm={remove}
      />
    </div>
  );
}
