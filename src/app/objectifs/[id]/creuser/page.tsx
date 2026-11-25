"use client";

import { Plus, Search } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { FamilyIcon } from "@/components/cap/family";
import { ParetoChart, paretoSentence, QuoteBubble, WhyChain } from "@/components/cap/misc";
import { Button, LinkButton } from "@/components/ui/button";
import { ErrorState, IconCircle, Skeleton } from "@/components/ui/feedback";
import { ChipGroup, RatingScale, TextArea, TextField } from "@/components/ui/form";
import { StepHeader, StepQuestion, StickyFooter } from "@/components/ui/layout";
import { BottomSheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { CAUSE_FAMILIES, CAUSE_FAMILY_LABELS, type CauseFamily } from "@/lib/domain/types";
import { clearDraft, readDraft, writeDraft } from "@/lib/prefs";
import { causeFamilySchema } from "@/lib/repo/schemas";
import { actionsOf, reviewsOf, thisWeek } from "@/lib/selectors";
import { useStore } from "@/lib/store";

const FAMILIES: Record<CauseFamily, { question: string; chips: string[]; actions: string[] }> = {
  moi: {
    question: "Qu'est-ce qui, chez toi, peut freiner ?",
    chips: ["Fatigue", "Peu d'envie en ce moment", "Peur de ne pas y arriver", "Stress", "Santé"],
    actions: ["Commencer par 5 minutes", "Me récompenser après"],
  },
  temps: {
    question: "Côté emploi du temps, qu'est-ce qui gêne ?",
    chips: ["Journées trop chargées", "Pas de créneau fixe", "Imprévus fréquents", "Mauvais moment de la journée"],
    actions: ["Bloquer un créneau fixe", "Le faire le matin"],
  },
  environnement: {
    question: "Autour de toi, qu'est-ce qui complique les choses ?",
    chips: ["Entourage peu soutenant", "Météo", "Trop de distractions", "Lieu peu pratique"],
    actions: ["En parler à un proche", "Préparer mon espace la veille"],
  },
  moyens: {
    question: "Te manque-t-il quelque chose ?",
    chips: ["Matériel", "Budget", "Informations", "Aide de quelqu'un"],
    actions: ["Lister ce qu'il me manque", "Demander de l'aide"],
  },
  methode: {
    question: "Et ta façon de t'y prendre ?",
    chips: ["Marche trop haute", "Pas de rappel", "Pas assez précis", "Trop d'actions à la fois"],
    actions: ["Diviser en plus petit", "Mettre un rappel"],
  },
};

const PARTS = ["1. Pourquoi", "2. Le tour des causes", "3. Ce qui pèse le plus", "4. Ma prochaine action"];
const HARSH = /(je suis nul|je suis nulle|flemme|pas capable)/i;

const draftSchema = z.object({
  problem: z.string().max(1000).default(""),
  whys: z.array(z.string().max(1000)).max(5).default([]),
  probableFamily: causeFamilySchema.nullable().default(null),
  causes: z.array(z.object({ family: causeFamilySchema, label: z.string().max(120), weight: z.number().int().min(1).max(5) })).default([]),
  target: z.string().max(120).default(""),
  action: z.string().max(120).default(""),
});
type Draft = z.output<typeof draftSchema>;

export default function CreuserPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { data, status, run, reload } = useStore();
  const goal = data.goals.find((g) => g.id === id);
  const etape = params.get("etape") ?? "intro";
  const draftName = `creuser-${id}`;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [familyDismissed, setFamilyDismissed] = useState(false);
  const [custom, setCustom] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const [replaceAsk, setReplaceAsk] = useState(false);
  const [replaceId, setReplaceId] = useState<string | "keep" | null>(null);
  const [saving, setSaving] = useState(false);

  const lastStuck = goal ? reviewsOf(data, goal.id).find((r) => r.verdict === "stuck") : undefined;

  useEffect(() => {
    if (draft || status !== "ready" || !goal) return;
    const saved = readDraft(draftName, draftSchema);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialisation unique du brouillon
    setDraft(saved ?? { ...draftSchema.parse({}), problem: lastStuck?.whatBlocked ?? "" });
  }, [draft, status, goal, draftName, lastStuck]);


  if (status === "loading" || (goal && !draft)) return <Skeleton className="mt-16" />;
  if (status === "error") return <ErrorState title="On n'arrive pas à afficher tes objectifs." onRetry={reload} />;
  if (!goal || !draft) {
    return (
      <div className="pt-10">
        <ErrorState title="Cet objectif n'existe plus." />
        <LinkButton href="/objectifs" variant="secondary" fullWidth>
          Voir mes objectifs
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
  const go = (e: string) => router.push(`/objectifs/${goal.id}/creuser?etape=${e}`);
  const close = () => router.push(`/objectifs/${goal.id}`);
  const whys = draft.whys.filter((w) => w.trim());
  const probable = whys.at(-1) ?? draft.problem;
  const askFamily = etape === "famille-1" && whys.length > 0 && !draft.probableFamily && !familyDismissed;
  const setAskFamily = (v: boolean) => setFamilyDismissed(!v);

  const toggleCause = (family: CauseFamily, label: string) => {
    const exists = draft.causes.some((c) => c.family === family && c.label === label);
    update({ causes: exists ? draft.causes.filter((c) => !(c.family === family && c.label === label)) : [...draft.causes, { family, label, weight: 3 }] });
  };

  const pareto = draft.causes.length ? paretoSentence(draft.causes) : { text: "", top: [] };
  const targetLabel = draft.target || pareto.top[0]?.label || probable;
  const targetCause = draft.causes.find((c) => c.label === targetLabel);
  const weekActions = actionsOf(data, goal.id, thisWeek());

  const save = async (replace: string | "keep" | null) => {
    setSaving(true);
    try {
      await run(async (repo) => {
        await repo.createAnalysis({
          goalId: goal.id,
          reviewId: lastStuck?.id,
          problem: draft.problem.trim() || probable.slice(0, 1000) || goal.title,
          whys: whys.map((w) => w.trim()),
          causes: draft.causes.map((c) => ({ ...c, label: c.label.slice(0, 120) })),
          decision: draft.action.trim(),
        });
        const kept = weekActions.filter((a) => a.id !== replace);
        await repo.saveWeekPlan(goal.id, thisWeek(), [
          ...kept.map((a) => ({ id: a.id, label: a.label, targetCount: a.targetCount, days: a.days })),
          { label: draft.action.trim(), targetCount: 1 },
        ]);
      });
      clearDraft(draftName);
      setReplaceAsk(false);
      go("fin");
    } catch {
      toast("Ton analyse n'est pas enregistrée. Réessaie.", { tone: "attention" });
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- Intro ---------------- */
  if (etape === "intro") {
    return (
      <div className="flex min-h-dvh flex-col justify-center gap-5 py-8 text-center">
        <div className="flex justify-center">
          <IconCircle icon={Search} />
        </div>
        <StepQuestion>Creusons ensemble</StepQuestion>
        <p className="-mt-6 text-body text-ink-muted">
          Quand ça coince, ce n&apos;est presque jamais une question de volonté. On va chercher ce qui te freine vraiment, en 4 petites étapes. Compte 10 minutes.
        </p>
        <div className="space-y-2">
          <Button fullWidth onClick={() => go("pourquoi-0")}>
            On y va
          </Button>
          <LinkButton href={`/objectifs/${goal.id}`} fullWidth>
            Pas maintenant
          </LinkButton>
        </div>
      </div>
    );
  }

  /* ---------------- Fin ---------------- */
  if (etape === "fin") {
    return (
      <div className="flex min-h-dvh flex-col justify-center gap-5 py-8 text-center">
        <StepQuestion help="Tu sais maintenant sur quoi agir. On en reparle à ton prochain bilan.">Bien creusé.</StepQuestion>
        <LinkButton href={`/objectifs/${goal.id}`} variant="primary" fullWidth>
          Voir mon plan
        </LinkButton>
      </div>
    );
  }

  let part = 1;
  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;
  let back: (() => void) | undefined = () => router.back();

  const whyMatch = /^pourquoi-(\d)$/.exec(etape);
  const famMatch = /^famille-(\d)$/.exec(etape);

  if (whyMatch && Number(whyMatch[1]) === 0) {
    back = () => go("intro");
    body = (
      <div className="space-y-3">
        <StepQuestion help="Décris ce qui se passe, pas ce que tu penses de toi.">Qu&apos;est-ce qui coince, en une phrase ?</StepQuestion>
        <TextArea
          label="Ce qui coince"
          hideLabel
          maxLength={1000}
          placeholder="Ex. : je ne vais pas courir le soir"
          value={draft.problem}
          onChange={(e) => update({ problem: e.target.value })}
          hint="Évite d'écrire des informations sur d'autres personnes ou des données médicales détaillées."
        />
        {HARSH.test(draft.problem) && (
          <p className="rounded-md bg-primary-soft p-3 text-small">Essaie de décrire le fait : “je ne sors pas courir” plutôt que “je suis nul”.</p>
        )}
      </div>
    );
    footer = (
      <Button fullWidth disabled={!draft.problem.trim()} onClick={() => go("pourquoi-1")}>
        Continuer
      </Button>
    );
  } else if (whyMatch) {
    const n = Math.min(5, Number(whyMatch[1]));
    const previous = n === 1 ? draft.problem : draft.whys[n - 2] ?? "";
    const value = draft.whys[n - 1] ?? "";
    const setWhy = (v: string) => {
      const next = [...draft.whys];
      while (next.length < n) next.push("");
      next[n - 1] = v;
      update({ whys: next.slice(0, 5) });
    };
    const toRecap = () => {
      update({ whys: draft.whys.slice(0, n) });
      go("chemin");
    };
    body = (
      <div className="space-y-4">
        <QuoteBubble>{previous}</QuoteBubble>
        <StepQuestion help={n === 1 ? "Réponds simplement. On va creuser 5 fois au maximum." : undefined}>{n === 1 ? "Pourquoi ?" : "Et pourquoi ça ?"}</StepQuestion>
        <TextArea label={`Pourquoi n° ${n}`} hideLabel maxLength={1000} value={value} onChange={(e) => setWhy(e.target.value)} />
        <div className="flex items-center gap-2" aria-label={`Pourquoi n° ${n} sur 5`} role="img">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i <= n ? "bg-primary" : "bg-border-strong"}`} />
          ))}
          <span className="ml-1 text-caption text-ink-muted" aria-hidden="true">
            Pourquoi n° {n} sur 5
          </span>
        </div>
      </div>
    );
    footer = (
      <>
        {n >= 2 && (
          <Button variant="ghost" fullWidth onClick={toRecap}>
            Je crois que j&apos;ai trouvé
          </Button>
        )}
        <Button fullWidth disabled={!value.trim()} onClick={() => (n < 5 ? go(`pourquoi-${n + 1}`) : toRecap())}>
          {n < 5 ? "Encore un pourquoi" : "Continuer"}
        </Button>
      </>
    );
  } else if (etape === "chemin") {
    body = (
      <div className="space-y-4">
        <StepQuestion help="Gardons-la en tête. Maintenant, faisons le tour des autres causes possibles.">Voici ton chemin</StepQuestion>
        <WhyChain items={whys.length ? whys : [draft.problem]} />
      </div>
    );
    footer = (
      <Button fullWidth onClick={() => go("famille-1")}>
        Continuer
      </Button>
    );
  } else if (famMatch) {
    part = 2;
    const k = Math.min(5, Math.max(1, Number(famMatch[1])));
    const family = CAUSE_FAMILIES[k - 1];
    const info = FAMILIES[family];
    const mine = draft.causes.filter((c) => c.family === family).map((c) => c.label);
    const extra = mine.filter((l) => !info.chips.includes(l));
    const next = () => {
      if (k < 5) go(`famille-${k + 1}`);
      else go(draft.causes.length ? "poids" : "aucune");
    };
    body = (
      <div className="space-y-4">
        <div className="flex items-center gap-2 pt-3 text-primary">
          <FamilyIcon family={family} size={24} />
          <span className="text-heading">{CAUSE_FAMILY_LABELS[family]}</span>
        </div>
        <StepQuestion size="title">{info.question}</StepQuestion>
        <ChipGroup
          label={CAUSE_FAMILY_LABELS[family]}
          mode="multiple"
          value={mine}
          options={[...info.chips, ...extra].map((v) => ({ value: v, label: v }))}
          onChange={(v) => toggleCause(family, v)}
        />
        {addingCustom ? (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const label = custom.trim();
              if (label && !mine.includes(label)) toggleCause(family, label);
              setCustom("");
              setAddingCustom(false);
            }}
          >
            <div className="flex-1">
              <TextField label="Ma cause" maxLength={60} value={custom} onChange={(e) => setCustom(e.target.value)} autoFocus />
            </div>
            <Button type="submit" size="sm" className="mb-7">
              Ajouter
            </Button>
          </form>
        ) : (
          <Button variant="ghost" iconLeft={<Plus size={20} aria-hidden="true" />} onClick={() => setAddingCustom(true)}>
            Ajouter ma propre cause
          </Button>
        )}
        <p className="text-small text-ink-muted" aria-live="polite">
          {draft.causes.length} cause{draft.causes.length > 1 ? "s" : ""} notée{draft.causes.length > 1 ? "s" : ""}
        </p>
        <p className="text-small text-ink-muted">Coche tout ce qui te parle, même un peu.</p>
      </div>
    );
    footer = (
      <>
        <Button variant="ghost" fullWidth onClick={next}>
          Rien ici
        </Button>
        <Button fullWidth onClick={next}>
          {k < 5 ? "Famille suivante" : "Voir mes causes"}
        </Button>
      </>
    );
  } else if (etape === "aucune") {
    part = 2;
    body = <StepQuestion size="title">Tu n&apos;as noté aucune cause. Ce n&apos;est pas grave : ton chemin des pourquoi suffit peut-être.</StepQuestion>;
    footer = (
      <Button fullWidth onClick={() => go("action")}>
        Continuer
      </Button>
    );
  } else if (etape === "poids") {
    part = 3;
    body = (
      <div className="space-y-4">
        <StepQuestion help="Pour chaque cause, dis à quel point elle te freine.">Qu&apos;est-ce qui pèse le plus ?</StepQuestion>
        <ul className="space-y-3">
          {draft.causes.map((c, i) => (
            <li key={`${c.family}-${c.label}`} className="card space-y-2">
              <p className="flex items-center gap-2 text-body font-semibold">
                <FamilyIcon family={c.family} size={18} />
                {c.label}
              </p>
              <RatingScale
                size="compact"
                label={`Poids de « ${c.label} »`}
                value={c.weight}
                minLabel="Un peu"
                maxLabel="Énormément"
                onChange={(w) => update({ causes: draft.causes.map((x, j) => (j === i ? { ...x, weight: w } : x)) })}
              />
            </li>
          ))}
        </ul>
      </div>
    );
    footer = (
      <Button fullWidth onClick={() => go("resultat")}>
        Voir le résultat
      </Button>
    );
  } else if (etape === "resultat") {
    part = 3;
    body = (
      <div className="space-y-4">
        <StepQuestion>Voici ce qui pèse le plus</StepQuestion>
        <div className="card">
          <ParetoChart causes={draft.causes} />
        </div>
        <p className="text-body">{pareto.text}</p>
      </div>
    );
    footer = (
      <Button fullWidth onClick={() => go("action")}>
        Choisir mon action
      </Button>
    );
  } else if (etape === "action") {
    part = 4;
    const family = targetCause?.family ?? draft.probableFamily ?? "methode";
    const options = (pareto.top.length ? pareto.top.map((c) => c.label) : [probable.slice(0, 120)]).filter(Boolean);
    body = (
      <div className="space-y-4">
        <StepQuestion help="Une action concrète, faisable cette semaine.">{`Que peux-tu faire contre “${targetLabel}” ?`}</StepQuestion>
        {options.length > 1 && <ChipGroup label="Cause visée" value={targetLabel} options={options.map((v) => ({ value: v, label: v }))} onChange={(v) => update({ target: v })} />}
        <TextField label="Mon action" maxLength={120} value={draft.action} onChange={(e) => update({ action: e.target.value })} />
        <ChipGroup label="Suggestions" mode="multiple" value={[]} options={FAMILIES[family].actions.map((v) => ({ value: v, label: v }))} onChange={(v) => update({ action: v })} />
      </div>
    );
    footer = (
      <Button
        fullWidth
        disabled={!draft.action.trim()}
        loading={saving}
        onClick={() => {
          if (weekActions.length >= 3) {
            setReplaceId(weekActions[0].id);
            setReplaceAsk(true);
          } else void save(null);
        }}
      >
        Ajouter à mon plan
      </Button>
    );
  } else {
    body = <ErrorState title="Cette étape n'existe pas." />;
    back = () => go("intro");
  }

  return (
    <div className="pb-sticky">
      <StepHeader step={part} total={4} label={PARTS[part - 1]} onBack={back} onClose={close} />
      {body}
      <StickyFooter>{footer}</StickyFooter>

      <BottomSheet open={askFamily} title="Dans quelle famille la ranges-tu ?" description={<QuoteBubble>{probable}</QuoteBubble>} onClose={() => setAskFamily(false)}>
        <div role="radiogroup" aria-label="Famille de la cause probable" className="space-y-2">
          {CAUSE_FAMILIES.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={draft.probableFamily === f}
              className="flex min-h-12 w-full items-center gap-3 rounded-md border border-border-strong px-4 text-left font-semibold"
              onClick={() => {
                const label = probable.trim().slice(0, 120);
                update({
                  probableFamily: f,
                  causes: [...draft.causes.filter((c) => c.label !== label), { family: f, label, weight: 4 }],
                });
                setAskFamily(false);
              }}
            >
              <FamilyIcon family={f} />
              {CAUSE_FAMILY_LABELS[f]}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={replaceAsk} title="Ton plan a déjà 3 actions. Laquelle remplacer ?" onClose={() => setReplaceAsk(false)}>
        <div role="radiogroup" aria-label="Action à remplacer" className="space-y-2">
          {weekActions.map((a) => (
            <label key={a.id} className="flex min-h-12 items-center gap-3 rounded-md border border-border-strong px-4">
              <input type="radio" name="replace" checked={replaceId === a.id} onChange={() => setReplaceId(a.id)} className="h-5 w-5 accent-[var(--color-primary)]" />
              <span>{a.label}</span>
            </label>
          ))}
        </div>
        <Button fullWidth loading={saving} onClick={() => save(replaceId)}>
          Remplacer
        </Button>
        <Button variant="secondary" fullWidth onClick={() => save("keep")}>
          Garder les 4 cette fois
        </Button>
      </BottomSheet>
    </div>
  );
}
