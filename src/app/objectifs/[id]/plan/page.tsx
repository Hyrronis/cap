"use client";

import { Plus, Trash2 } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Chip, ChipGroup, SegmentedControl, Stepper, TextField } from "@/components/ui/form";
import { AppHeader, StickyFooter } from "@/components/ui/layout";
import { useToast } from "@/components/ui/toast";
import { addDays, isIsoDate, weekStart } from "@/lib/domain/calculs";
import type { MarkerAggregation, MarkerDirection } from "@/lib/domain/types";
import { JOURS, JOURS_COURTS, lireNombre, semaine } from "@/lib/format";
import { actionsOf, lastPlan, markersOf, reviewFor, thisWeek } from "@/lib/selectors";
import { useStore } from "@/lib/store";

interface ActionRow {
  key: string;
  id?: string;
  label: string;
  targetCount: number;
  days: number[];
}
interface MarkerRow {
  key: string;
  id?: string;
  name: string;
  unit: string;
  baseline: string;
  target: string;
  direction: MarkerDirection;
  aggregation: MarkerAggregation;
}

const GENERIC = ["Préparer mes affaires la veille", "Bloquer un créneau dans mon agenda", "Commencer par 10 minutes"];
let seq = 0;
const key = () => `k${++seq}`;
const num = (n: number) => String(n).replace(".", ",");

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { data, status, run, reload } = useStore();
  const goal = data.goals.find((g) => g.id === id);

  const fromReview = params.get("depuis") === "bilan";
  const reviewedWeek = params.get("semaine");
  const baseWeek = reviewedWeek && isIsoDate(reviewedWeek) ? weekStart(reviewedWeek) : thisWeek();
  const targetWeek = fromReview ? addDays(baseWeek, 7) : thisWeek();
  const review = fromReview ? reviewFor(data, id, baseWeek) : undefined;

  const [actions, setActions] = useState<ActionRow[] | null>(null);
  const [markers, setMarkers] = useState<MarkerRow[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Mon plan de la semaine · Cap";
  }, []);

  useEffect(() => {
    if (actions || status !== "ready" || !goal) return;
    const current = actionsOf(data, id, targetWeek);
    const source = current.length ? current : lastPlan(data, id, targetWeek);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- préremplissage unique du formulaire
    setActions(
      source.map((a) => ({ key: key(), id: current.length ? a.id : undefined, label: a.label, targetCount: a.targetCount, days: a.days ?? [] })),
    );
    setMarkers(
      markersOf(data, id).map((m) => ({
        key: key(),
        id: m.id,
        name: m.name,
        unit: m.unit,
        baseline: num(m.baseline),
        target: num(m.target),
        direction: m.direction,
        aggregation: m.aggregation,
      })),
    );
  }, [actions, status, goal, data, id, targetWeek]);

  if (status === "loading" || (goal && !actions)) return <Skeleton shape="chart" className="mt-16" />;
  if (status === "error") return <ErrorState title="On n'arrive pas à afficher tes objectifs." onRetry={reload} />;
  if (!goal || !actions) {
    return (
      <div className="pt-10">
        <ErrorState title="Cet objectif n'existe plus." />
        <LinkButton href="/objectifs" variant="secondary" fullWidth>
          Voir mes objectifs
        </LinkButton>
      </div>
    );
  }

  const suggestions = (() => {
    const how = goal.context?.how ?? "";
    const parts = how
      .split(/[,;.\n]| et /)
      .map((s) => s.trim())
      .filter((s) => s.length >= 4 && s.length <= 120);
    const list = parts.length ? parts.slice(0, 3) : GENERIC;
    return list.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  })();

  const setAction = (k: string, patch: Partial<ActionRow>) => setActions((list) => list!.map((a) => (a.key === k ? { ...a, ...patch } : a)));
  const setMarker = (k: string, patch: Partial<MarkerRow>) => setMarkers((list) => list.map((m) => (m.key === k ? { ...m, ...patch } : m)));
  const addAction = (label = "") => setActions((list) => [...list!, { key: key(), label, targetCount: 3, days: [] }]);

  const valid = actions.some((a) => a.label.trim());

  const save = async () => {
    setSubmitted(true);
    if (!valid) return;
    setSaving(true);
    try {
      await run(async (repo) => {
        await repo.saveWeekPlan(
          goal.id,
          targetWeek,
          actions.filter((a) => a.label.trim()).map((a) => ({ id: a.id, label: a.label.trim(), targetCount: a.targetCount, days: a.days.length ? a.days : undefined })),
        );
        await repo.saveMarkers(
          goal.id,
          markers
            .filter((m) => m.name.trim())
            .map((m) => {
              const baseline = lireNombre(m.baseline) ?? 0;
              return {
                id: m.id,
                name: m.name.trim(),
                unit: m.unit.trim(),
                baseline,
                target: lireNombre(m.target) ?? baseline,
                direction: m.direction,
                aggregation: m.aggregation,
              };
            }),
        );
      });
      toast("Ton plan est prêt. Bonne semaine.", { tone: "success" });
      router.push("/");
    } catch {
      toast("Ton plan n'est pas enregistré. Réessaie.", { tone: "attention" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-sticky">
      <AppHeader back={() => router.back()} title="Mon plan de la semaine" subtitle={`Semaine ${semaine(targetWeek)}`} />
      <p className="-mt-5 text-small text-ink-muted">Pour : {goal.title}</p>

      {fromReview && review?.whatIChange && (
        <p className="rounded-lg bg-primary-soft p-4 text-body">Tu as dit : “{review.whatIChange}”</p>
      )}

      <section aria-labelledby="actions-title" className="space-y-3">
        <div>
          <h2 id="actions-title" className="text-heading">
            Mes actions
          </h2>
          <p className="text-small text-ink-muted">1 à 3 petites actions. Assez petites pour les faire même un jour moyen.</p>
        </div>
        {actions.length === 0 && (
          <div className="flex flex-wrap gap-x-2" aria-label="Suggestions">
            {suggestions.map((s) => (
              <Chip key={s} variant="suggestion" icon={<Plus size={16} aria-hidden="true" />} onClick={() => addAction(s)}>
                {s}
              </Chip>
            ))}
          </div>
        )}
        <ul className="space-y-3">
          {actions.map((a, i) => (
            <li key={a.key} className="card space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <TextField
                    label="Ce que je fais"
                    placeholder="Ex. : courir 20 minutes"
                    maxLength={120}
                    value={a.label}
                    onChange={(e) => setAction(a.key, { label: e.target.value })}
                    error={submitted && !a.label.trim() && i === 0 && !valid ? "Écris ton action en quelques mots." : null}
                  />
                </div>
                <button
                  type="button"
                  aria-label="Retirer cette action"
                  onClick={() => setActions((list) => list!.filter((x) => x.key !== a.key))}
                  className="mt-7 inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
                >
                  <Trash2 size={20} aria-hidden="true" />
                </button>
              </div>
              <Stepper label="Combien de fois cette semaine ?" value={a.targetCount} min={1} max={7} onChange={(n) => setAction(a.key, { targetCount: n })} />
              <div role="group" aria-label="Jours (facultatif)" className="flex justify-between">
                {JOURS_COURTS.map((j, idx) => {
                  const d = idx + 1;
                  const sel = a.days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={sel}
                      aria-label={JOURS[idx]}
                      onClick={() => setAction(a.key, { days: sel ? a.days.filter((x) => x !== d) : [...a.days, d].sort() })}
                      className={`h-11 w-11 rounded-full border text-small font-bold ${sel ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-ink"}`}
                    >
                      {j}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
        {submitted && !valid && actions.length === 0 && (
          <p role="alert" className="text-small font-semibold text-attention">
            Écris ton action en quelques mots.
          </p>
        )}
        {actions.length < 3 ? (
          <Button variant="ghost" iconLeft={<Plus size={20} aria-hidden="true" />} onClick={() => addAction()}>
            Ajouter une action
          </Button>
        ) : (
          <p className="text-small text-ink-muted">3 actions, c&apos;est le bon maximum.</p>
        )}
      </section>

      <section aria-labelledby="markers-title" className="space-y-3">
        <div>
          <h2 id="markers-title" className="text-heading">
            Mes repères
          </h2>
          <p className="text-small text-ink-muted">Des chiffres simples à noter, pour voir le chemin parcouru.</p>
        </div>
        <ul className="space-y-3">
          {markers.map((m, i) => (
            <li key={m.key} className="card space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <TextField label="Ce que je note" placeholder="Ex. : Minutes de sommeil" maxLength={120} value={m.name} onChange={(e) => setMarker(m.key, { name: e.target.value })} />
                </div>
                {i === 0 ? (
                  <span className="mt-8">
                    <Badge tone="primary">Principal</Badge>
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label="Retirer ce repère"
                    onClick={() => setMarkers((list) => list.filter((x) => x.key !== m.key))}
                    className="mt-7 inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted"
                  >
                    <Trash2 size={20} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Unité" maxLength={20} value={m.unit} onChange={(e) => setMarker(m.key, { unit: e.target.value })} />
                <TextField label="Départ" inputMode="decimal" value={m.baseline} onChange={(e) => setMarker(m.key, { baseline: e.target.value })} />
              </div>
              <TextField label={i === 0 ? "Mon but" : "Ma cible (facultatif)"} inputMode="decimal" value={m.target} onChange={(e) => setMarker(m.key, { target: e.target.value })} suffix={m.unit || undefined} />
              <SegmentedControl
                label="Sens du repère"
                options={[
                  { value: "up", label: "Plus c'est haut, mieux c'est" },
                  { value: "down", label: "Plus c'est bas, mieux c'est" },
                ]}
                value={m.direction}
                onChange={(v) => setMarker(m.key, { direction: v })}
              />
              <div className="space-y-1">
                <p className="text-small font-semibold">Quand tu notes plusieurs valeurs dans la semaine, on…</p>
                <ChipGroup
                  label="Regroupement des valeurs de la semaine"
                  value={m.aggregation}
                  options={[
                    { value: "sum", label: "les additionne" },
                    { value: "avg", label: "fait la moyenne" },
                    { value: "last", label: "garde la dernière" },
                  ]}
                  onChange={(v) => setMarker(m.key, { aggregation: v })}
                />
              </div>
            </li>
          ))}
        </ul>
        {markers.length < 3 && (
          <Button
            variant="ghost"
            iconLeft={<Plus size={20} aria-hidden="true" />}
            onClick={() => setMarkers((list) => [...list, { key: key(), name: "", unit: "", baseline: "0", target: "", direction: "up", aggregation: "sum" }])}
          >
            Ajouter un repère
          </Button>
        )}
      </section>

      <StickyFooter>
        <Button fullWidth loading={saving} onClick={save}>
          {fromReview ? "Valider pour la semaine prochaine" : "Valider mon plan"}
        </Button>
      </StickyFooter>
    </div>
  );
}
