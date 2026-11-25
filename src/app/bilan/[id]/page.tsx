"use client";

import { PauseCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { MetricChart } from "@/components/cap/metric-chart";
import { MetricEntrySheet } from "@/components/cap/metric-entry-sheet";
import { Button, LinkButton } from "@/components/ui/button";
import { Banner, ErrorState, Skeleton } from "@/components/ui/feedback";
import { ChipGroup, ChoiceCard, SegmentedControl, TextArea } from "@/components/ui/form";
import { StepHeader, StepQuestion, StickyFooter } from "@/components/ui/layout";
import { useToast } from "@/components/ui/toast";
import { addDays, isIsoDate, isInWeek, markerGoalProgress, weekStart } from "@/lib/domain/calculs";
import type { Marker, WeeklyVerdict } from "@/lib/domain/types";
import { semaine } from "@/lib/format";
import { clearDraft, readDraft, usePrefs, writeDraft } from "@/lib/prefs";
import { actionsOf, activeGoals, digSuggestion, isReviewDue, markersOf, primaryMarker, reviewFor, reviewWeek, today, weekRate } from "@/lib/selectors";
import { useStore } from "@/lib/store";

const TOTAL = 5;
const draftSchema = z.object({
  whatWorked: z.string().max(1000).default(""),
  whatBlocked: z.string().max(1000).default(""),
  whatIChange: z.string().max(1000).default(""),
  verdict: z.enum(["progress", "stuck"]).nullable().default(null),
});
type Draft = z.output<typeof draftSchema>;

const appendChip = (text: string, chip: string) => (text.includes(chip) ? text : text.trim() ? `${text.trim()} ${chip}.` : `${chip}.`);

export default function BilanPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { reviewDay } = usePrefs();
  const { data, status, run, reload } = useStore();
  const goal = data.goals.find((g) => g.id === id);
  const weekParam = params.get("semaine");
  const ws = weekParam && isIsoDate(weekParam) ? weekStart(weekParam) : goal ? reviewWeek(data, goal.id, reviewDay) : today();
  const existing = goal ? reviewFor(data, goal.id, ws) : undefined;
  const etape = params.get("etape");
  const step = etape === "fin" ? 6 : etape ? Math.min(TOTAL, Math.max(1, Number(etape) || 1)) : existing ? 0 : 1;
  const draftName = `bilan-${id}-${ws}`;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [markerId, setMarkerId] = useState<string | null>(null);
  const [noting, setNoting] = useState<Marker | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (draft || status !== "ready") return;
    const saved = readDraft(draftName, draftSchema);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialisation unique (brouillon ou bilan existant)
    setDraft(
      saved ??
        (existing
          ? { whatWorked: existing.whatWorked, whatBlocked: existing.whatBlocked, whatIChange: existing.whatIChange, verdict: existing.verdict }
          : draftSchema.parse({})),
    );
  }, [draft, status, draftName, existing]);

  if (status === "loading" || (goal && !draft)) {
    return (
      <div className="space-y-3 pt-16" aria-busy="true">
        <Skeleton />
        <Skeleton shape="chart" />
      </div>
    );
  }
  if (status === "error") return <ErrorState title="On n'arrive pas à charger ta semaine." onRetry={reload} />;
  if (!goal || !draft) {
    return (
      <div className="pt-10">
        <ErrorState title="Cet objectif n'existe plus." />
        <LinkButton href="/bilan" variant="secondary" fullWidth>
          Retour au bilan
        </LinkButton>
      </div>
    );
  }

  const update = (patch: Partial<Draft>) =>
    setDraft((d) => {
      const next = { ...d!, ...patch };
      writeDraft(draftName, next);
      return next;
    });
  const q = weekParam ? `&semaine=${ws}` : "";
  const go = (n: number | "fin") => router.push(`/bilan/${goal.id}?etape=${n}${q}`);
  const close = () => router.push("/bilan");

  const rate = weekRate(data, goal.id, ws);
  const markers = markersOf(data, goal.id);
  const shown = markers.find((m) => m.id === markerId) ?? markers[0];
  const hasValuesThisWeek = data.measurements.some((m) => markers.some((k) => k.id === m.markerId) && isInWeek(m.date, ws));
  const pct = rate.planned ? rate.done / rate.planned : 0;
  const rateText = pct >= 0.8 ? "Tu as tenu ton plan." : pct >= 0.4 ? "Une bonne partie est faite." : "Semaine plus compliquée. Ça arrive, on regarde pourquoi.";
  const sunday = addDays(ws, 6) < today() ? addDays(ws, 6) : today();

  const finish = async () => {
    if (!draft.verdict) return;
    setSaving(true);
    try {
      await run((r) =>
        r.saveReview({
          goalId: goal.id,
          weekStart: ws,
          whatWorked: draft.whatWorked.trim(),
          whatBlocked: draft.whatBlocked.trim(),
          whatIChange: draft.whatIChange.trim(),
          verdict: draft.verdict as WeeklyVerdict,
        }),
      );
      clearDraft(draftName);
      go("fin");
    } catch {
      toast("Ton bilan n'est pas enregistré. Réessaie.", { tone: "attention" });
    } finally {
      setSaving(false);
    }
  };

  const keepPlan = async () => {
    const next = addDays(ws, 7);
    const current = actionsOf(data, goal.id, ws);
    try {
      if (!actionsOf(data, goal.id, next).length) {
        await run((r) => r.saveWeekPlan(goal.id, next, current.map((a) => ({ label: a.label, targetCount: a.targetCount, days: a.days }))));
      }
      toast("Même plan, nouvelle semaine. C'est parti.", { tone: "success" });
      router.push("/");
    } catch {
      toast("Ton plan n'est pas enregistré. Réessaie.", { tone: "attention" });
    }
  };

  /* ---------- Bilan déjà fait : lecture ---------- */
  if (step === 0 && existing) {
    return (
      <div className="space-y-4">
        <StepHeader step={TOTAL} total={TOTAL} onClose={close} confirmClose={false} label="Bilan fait" />
        <StepQuestion size="title">{`Ton bilan pour “${goal.title}”`}</StepQuestion>
        <dl className="card space-y-3">
          {[
            ["Ce qui a marché", existing.whatWorked],
            ["Ce qui a coincé", existing.whatBlocked],
            ["Ce que je change", existing.whatIChange],
            ["Pour cet objectif", existing.verdict === "progress" ? "Ça avance" : "Ça bloque"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-small font-semibold text-ink-muted">{k}</dt>
              <dd className="text-body">{v || "—"}</dd>
            </div>
          ))}
        </dl>
        <Button variant="ghost" fullWidth onClick={() => go(1)}>
          Modifier mes réponses
        </Button>
      </div>
    );
  }

  /* ---------- Fin de bilan ---------- */
  if (step === 6) {
    const review = reviewFor(data, goal.id, ws);
    const dig = digSuggestion(data, goal.id);
    const stuck2 = review?.verdict === "stuck" && dig.stuckStreak >= 2;
    const primary = primaryMarker(data, goal.id);
    const reached = primary ? markerGoalProgress(primary, data.measurements, today()) >= 100 : false;
    const nextDue = activeGoals(data).find((g) => g.id !== goal.id && isReviewDue(data, g.id, reviewDay) && !reviewFor(data, g.id, reviewWeek(data, g.id, reviewDay)));
    const otherTodo = nextDue ?? activeGoals(data).find((g) => g.id !== goal.id && !reviewFor(data, g.id, reviewWeek(data, g.id, reviewDay)));
    const title = review?.verdict === "progress" ? "Bilan fait. Bravo de prendre ce temps." : stuck2 ? "Ça coince depuis 2 semaines." : "Merci pour ton honnêteté.";
    const text =
      review?.verdict === "progress"
        ? "Ta semaine prochaine se prépare maintenant."
        : stuck2
          ? "Ce n'est pas un manque de volonté. Il y a sûrement une cause, et on peut la trouver en 10 minutes."
          : "Une semaine qui coince, c'est normal. Ajuste ton plan, on refait le point dans 7 jours.";
    const planHref = `/objectifs/${goal.id}/plan?depuis=bilan&semaine=${ws}`;
    return (
      <div className="flex min-h-dvh flex-col justify-center gap-4 py-8">
        <StepQuestion help={text}>{title}</StepQuestion>
        {reached && (
          <Banner tone="success" text="Ton repère a atteint ton but. Tu as peut-être réussi !">
            <Link href={`/objectifs/${goal.id}/retenir`} className="inline-flex min-h-11 items-center text-small font-semibold text-primary underline">
              J&apos;ai atteint mon objectif
            </Link>
          </Banner>
        )}
        <div className="space-y-2">
          {stuck2 ? (
            <>
              <LinkButton href={`/objectifs/${goal.id}/creuser?etape=intro`} variant="primary" fullWidth>
                Creuser la cause
              </LinkButton>
              <LinkButton href={planHref} variant="secondary" fullWidth>
                Juste ajuster mon plan
              </LinkButton>
            </>
          ) : (
            <>
              <LinkButton href={planHref} variant="primary" fullWidth>
                Ajuster mon plan
              </LinkButton>
              <Button variant="secondary" fullWidth onClick={keepPlan}>
                Garder mon plan tel quel
              </Button>
            </>
          )}
          {otherTodo && (
            <LinkButton href={`/bilan/${otherTodo.id}`} fullWidth>
              Bilan suivant
            </LinkButton>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Étapes 1 à 5 ---------- */
  return (
    <div className="pb-sticky">
      <StepHeader step={step} total={TOTAL} onBack={step > 1 ? () => go(step - 1) : undefined} onClose={close} />

      {step === 1 && (
        <div className="space-y-4">
          <StepQuestion size="title" help={`Semaine ${semaine(ws)}`}>{`Ta semaine pour “${goal.title}”`}</StepQuestion>
          <div className="card space-y-1">
            <p className="text-small font-semibold text-ink-muted">Actions faites</p>
            {rate.planned ? (
              <>
                <p className="text-number tabular-nums">
                  {rate.done} <span className="text-heading text-ink-muted">sur {rate.planned}</span>
                </p>
                <p className="text-body">{rateText}</p>
              </>
            ) : (
              <p className="text-body">Pas encore d&apos;action prévue cette semaine.</p>
            )}
          </div>
          {shown && (
            <div className="card space-y-3">
              {markers.length > 1 && (
                <SegmentedControl asTabs label="Choisir un repère" options={markers.map((m) => ({ value: m.id, label: m.name }))} value={shown.id} onChange={setMarkerId} />
              )}
              <h2 className="text-heading">{shown.name}</h2>
              <MetricChart marker={shown} measurements={data.measurements} refDate={addDays(ws, 6)} />
            </div>
          )}
          {markers.length > 0 && !hasValuesThisWeek && (
            <div className="space-y-1">
              <p className="text-body">Aucun repère noté cette semaine. Pas grave, tu peux en noter un maintenant.</p>
              <Button variant="ghost" onClick={() => setNoting(shown ?? null)}>
                Noter un repère
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <StepQuestion help="Même un petit truc compte.">Qu&apos;est-ce qui a marché cette semaine ?</StepQuestion>
          <TextArea label="Ce qui a marché" hideLabel maxLength={1000} value={draft.whatWorked} onChange={(e) => update({ whatWorked: e.target.value })} />
          <ChipGroup
            label="Idées"
            mode="multiple"
            value={[]}
            options={["J'ai tenu mes créneaux", "J'étais motivé·e", "Quelqu'un m'a aidé", "C'était plus facile que prévu"].map((v) => ({ value: v, label: v }))}
            onChange={(v) => update({ whatWorked: appendChip(draft.whatWorked, v) })}
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <StepQuestion help="Pas de jugement ici. On cherche juste ce qui gêne.">Qu&apos;est-ce qui a coincé ?</StepQuestion>
          <TextArea label="Ce qui a coincé" hideLabel maxLength={1000} value={draft.whatBlocked} onChange={(e) => update({ whatBlocked: e.target.value })} />
          <ChipGroup
            label="Idées"
            mode="multiple"
            value={[]}
            options={["Pas eu le temps", "Fatigue", "Imprévu", "Oublié", "Pas envie", "Rien, tout s'est bien passé"].map((v) => ({ value: v, label: v }))}
            onChange={(v) => update({ whatBlocked: appendChip(draft.whatBlocked, v) })}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <StepQuestion help="Une seule chose suffit. Garder le même plan, c'est aussi un choix.">Qu&apos;est-ce que tu changes pour la semaine prochaine ?</StepQuestion>
          <TextArea label="Ce que je change" hideLabel maxLength={1000} value={draft.whatIChange} onChange={(e) => update({ whatIChange: e.target.value })} />
          <ChipGroup
            label="Idées"
            mode="multiple"
            value={[]}
            options={["Je garde le même plan", "Je fais plus petit", "Je change de moment", "Je me fais un rappel"].map((v) => ({ value: v, label: v }))}
            onChange={(v) => update({ whatIChange: appendChip(draft.whatIChange, v) })}
          />
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3">
          <StepQuestion>Pour cet objectif, tu dirais…</StepQuestion>
          <div role="radiogroup" aria-label="Pour cet objectif, tu dirais…" className="space-y-3">
            <ChoiceCard large tone="success" icon={<TrendingUp size={28} />} title="Ça avance" description="Je suis sur la bonne voie." selected={draft.verdict === "progress"} onSelect={() => update({ verdict: "progress" })} />
            <ChoiceCard large tone="attention" icon={<PauseCircle size={28} />} title="Ça bloque" description="Je patine, quelque chose me freine." selected={draft.verdict === "stuck"} onSelect={() => update({ verdict: "stuck" })} />
          </div>
        </div>
      )}

      <StickyFooter>
        {step === 5 ? (
          <Button fullWidth disabled={!draft.verdict} loading={saving} onClick={finish}>
            Terminer mon bilan
          </Button>
        ) : (
          <>
            {(step === 2 || step === 3) && (
              <Button variant="ghost" fullWidth onClick={() => go(step + 1)}>
                Passer
              </Button>
            )}
            <Button fullWidth disabled={step === 4 && !draft.whatIChange.trim()} aria-describedby={step === 4 && !draft.whatIChange.trim() ? "req-help" : undefined} onClick={() => go(step + 1)}>
              Continuer
            </Button>
            {step === 4 && !draft.whatIChange.trim() && (
              <p id="req-help" className="text-center text-small text-ink-muted">
                Réponds pour continuer.
              </p>
            )}
          </>
        )}
      </StickyFooter>
      <MetricEntrySheet marker={noting} defaultDate={sunday} onClose={() => setNoting(null)} />
    </div>
  );
}
