"use client";

import { Flag, User, Users, UsersRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { GoalSummary, type SummaryInput } from "@/components/cap/misc";
import { Button, LinkButton } from "@/components/ui/button";
import { Banner, IconCircle } from "@/components/ui/feedback";
import { ChipGroup, ChoiceCard, RatingScale, SegmentedControl, TextArea, TextField } from "@/components/ui/form";
import { StepHeader, StepQuestion, StickyFooter } from "@/components/ui/layout";
import { BottomSheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { addDays, daysBetween, weekStart } from "@/lib/domain/calculs";
import { IdeesIa } from "@/components/cap/idees-ia";
import { PROFILS, detecterProfil, fusionnerSansDoublons, memeLibelle, premierNombre, profilParId, type Profil, type RepereSuggere } from "@/lib/domain/profils";
import type { IaEntree, IaSortie } from "@/lib/ia/schema";
import type { Goal } from "@/lib/domain/types";
import { lireNombre, nombre } from "@/lib/format";
import { clearDraft, readDraft, writeDraft } from "@/lib/prefs";
import { primaryMarker, today } from "@/lib/selectors";
import { useStore } from "@/lib/store";

const TOTAL = 8;

const draftSchema = z.object({
  step: z.number().int().min(1).max(8).default(1),
  what: z.string().max(120).default(""),
  why: z.string().max(200).default(""),
  measureName: z.string().max(120).default(""),
  target: z.string().max(20).default(""),
  baseline: z.string().max(20).default(""),
  unit: z.string().max(20).default(""),
  direction: z.enum(["up", "down"]).default("up"),
  aggregation: z.enum(["sum", "avg", "last"]).default("last"),
  /** Profil choisi à la main (sinon détecté à partir du texte). */
  profil: z.string().max(30).nullable().default(null),
  deadlineChoice: z.enum(["1m", "3m", "6m", "date"]).nullable().default(null),
  deadline: z.string().max(10).default(""),
  how: z.string().max(1000).default(""),
  where: z.string().max(120).default(""),
  whoMode: z.enum(["seul", "avec", "groupe"]).nullable().default(null),
  whoName: z.string().max(120).default(""),
  time: z.enum(["30 min", "1 h", "2 h", "3 h ou plus"]).nullable().default(null),
  feasibility: z.number().int().min(1).max(5).nullable().default(null),
  name: z.string().max(120).default(""),
  recipeId: z.string().max(100).optional(),
});
type Draft = z.output<typeof draftSchema>;
const emptyDraft = (): Draft => draftSchema.parse({});

const monthsFromNow = (n: number) => {
  const d = new Date();
  const t = new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};

function whoPhrase(d: Draft): string {
  if (d.whoMode === "seul") return "seul·e";
  if (d.whoMode === "groupe") return "en groupe";
  if (d.whoMode === "avec") return d.whoName.trim() ? `avec ${d.whoName.trim()}` : "avec quelqu'un";
  return "";
}

function draftFromGoal(goal: Goal, data: ReturnType<typeof useStore>["data"]): Draft {
  const m = primaryMarker(data, goal.id);
  const who = goal.context?.who ?? "";
  return {
    ...emptyDraft(),
    what: goal.context?.what ?? goal.smart.specific ?? goal.title,
    why: goal.context?.why ?? goal.smart.relevant ?? "",
    measureName: m?.name ?? "",
    target: m ? String(m.target).replace(".", ",") : "",
    baseline: m ? String(m.baseline).replace(".", ",") : "",
    unit: m?.unit ?? "",
    direction: m?.direction ?? "up",
    aggregation: m?.aggregation ?? "last",
    profil: goal.profil ?? null,
    deadlineChoice: goal.smart.deadline ? "date" : null,
    deadline: goal.smart.deadline ?? "",
    how: goal.context?.how ?? "",
    where: goal.context?.where ?? "",
    whoMode: who === "seul·e" ? "seul" : who === "en groupe" ? "groupe" : who ? "avec" : null,
    whoName: who.startsWith("avec ") ? who.slice(5) : who === "seul·e" || who === "en groupe" ? "" : who,
    time: (["30 min", "1 h", "2 h", "3 h ou plus"] as const).find((t) => t === goal.context?.howMuch) ?? null,
    feasibility: 3,
    name: goal.title,
  };
}

/** Repère principal proposé par le profil (le but chiffré est repris du texte s'il y en a un). */
function prefillMarker(profil: Profil, d: Draft): Partial<Draft> {
  const r = profil.reperes[0];
  const n = premierNombre(d.what);
  return {
    measureName: r.nom,
    unit: r.unite,
    direction: r.sens,
    aggregation: r.regroupement,
    target: d.target.trim() ? d.target : n != null && n > 0 ? String(n).replace(".", ",") : "",
    baseline: d.baseline.trim() ? d.baseline : r.depart != null ? String(r.depart).replace(".", ",") : "",
  };
}

const PREFILLED_NAMES = new Set(PROFILS.map((p) => p.reperes[0].nom));

/** Petite ligne discrète : profil repéré + possibilité d'en choisir un autre. */
function ProfilLine({ profil, onChange }: { profil: Profil; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <p className="-mt-2 mb-3 flex flex-wrap items-center gap-x-1 text-caption text-ink-muted">
        <span>
          Objectif repéré : <span className="font-semibold text-ink">{profil.libelle}</span>
        </span>
        <span aria-hidden="true">·</span>
        <button type="button" className="min-h-11 font-semibold text-primary underline" onClick={() => setOpen(true)} aria-label={`Changer le type d'objectif (actuellement ${profil.libelle})`}>
          changer
        </button>
      </p>
      <BottomSheet open={open} title="Ton objectif parle plutôt de…" description="On adapte les exemples et les idées." onClose={() => setOpen(false)}>
        <ChipGroup
          label="Type d'objectif"
          value={profil.id}
          options={PROFILS.map((p) => ({ value: p.id, label: p.libelle }))}
          onChange={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      </BottomSheet>
    </>
  );
}

function canContinue(step: number, d: Draft): boolean {
  switch (step) {
    case 1:
      return d.what.trim().length >= 3;
    case 2:
      return d.why.trim().length > 0;
    case 3: {
      const n = lireNombre(d.target);
      return d.measureName.trim().length > 0 && d.unit.trim().length > 0 && n != null && n > 0 && (d.baseline.trim() === "" || lireNombre(d.baseline) != null);
    }
    case 4:
      return !!d.deadline && d.deadline > today();
    case 5:
      return d.how.trim().length > 0;
    case 6:
      return d.whoMode != null;
    case 7:
      return d.time != null && d.feasibility != null;
    default:
      return d.name.trim().length > 0;
  }
}

/** Assistant « Créer un objectif » (8 étapes, étape dans l'URL, brouillon repris). */
export function GoalWizard({ goalId }: { goalId?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { data, status, run } = useStore();
  const editing = data.goals.find((g) => g.id === goalId);
  const draftName = goalId ? `objectif-${goalId}` : "objectif";
  const base = goalId ? `/objectifs/${goalId}/modifier` : "/objectifs/nouveau";
  const stepParam = params.get("etape");
  const step = stepParam === "fin" ? 9 : Math.min(TOTAL, Math.max(1, Number(stepParam) || 1));
  const recipeParam = params.get("recette");

  const [draft, setDraft] = useState<Draft | null>(null);
  const [resumeOffer, setResumeOffer] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(params.get("id"));
  /** Idées de l'IA reçues pour un texte d'objectif donné (jamais demandées automatiquement). */
  const [ia, setIa] = useState<{ pour: string; idees: IaSortie } | null>(null);

  // Initialisation : brouillon, objectif à modifier, ou recette.
  useEffect(() => {
    if (draft || status !== "ready") return;
    const saved = readDraft(draftName, draftSchema);
    let initial = emptyDraft();
    if (editing) initial = draftFromGoal(editing, data);
    const recipe = recipeParam ? data.recipes.find((r) => r.id === recipeParam) : undefined;
    if (recipe) initial = { ...initial, how: recipe.steps.join(", "), recipeId: recipe.id };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialisation unique depuis le stockage
    setDraft(initial);
    if (saved && !recipe && stepParam !== "fin" && (saved.what || saved.why)) setResumeOffer(saved);
  }, [draft, status, draftName, editing, data, recipeParam, stepParam]);

  const update = (patch: Partial<Draft>) =>
    setDraft((d) => {
      const next = { ...(d ?? emptyDraft()), ...patch, step };
      writeDraft(draftName, next);
      return next;
    });

  const profil: Profil = (draft && (profilParId(draft.profil) ?? detecterProfil(draft.what))) || PROFILS[PROFILS.length - 1];

  const go = (n: number) => {
    if (draft) {
      let next: Draft = { ...draft, step: n };
      // En arrivant sur le repère, on le préremplit selon le type d'objectif.
      if (n === 3 && !draft.measureName.trim() && !draft.unit.trim()) next = { ...next, ...prefillMarker(profil, draft) };
      setDraft(next);
      writeDraft(draftName, next);
    }
    router.push(`${base}?etape=${n}`);
  };

  const changeProfil = (id: string) => {
    const p = profilParId(id);
    if (!draft || !p) return;
    const auto = PREFILLED_NAMES.has(draft.measureName.trim());
    update({ profil: p.id, ...(auto ? { ...prefillMarker(p, draft), target: draft.target, baseline: draft.baseline } : {}) });
  };

  const summary: SummaryInput = useMemo(
    () => ({
      deadline: draft?.deadline || undefined,
      what: draft?.what.trim(),
      why: draft?.why.trim(),
      measureName: draft?.measureName.trim(),
      target: draft ? lireNombre(draft.target) : null,
      unit: draft?.unit.trim(),
      how: draft?.how.trim(),
      where: draft?.where.trim() || undefined,
      who: draft ? whoPhrase(draft) : undefined,
      time: draft?.time ?? undefined,
    }),
    [draft],
  );

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const target = lireNombre(draft.target) ?? 1;
    const baseline = lireNombre(draft.baseline) ?? 0;
    const goalFields = {
      title: draft.name.trim().slice(0, 120),
      profil: profil.id,
      smart: {
        specific: draft.what.trim(),
        measurable: `${draft.measureName.trim()} : ${nombre(target)} ${draft.unit.trim()}`,
        achievable: `Environ ${draft.time} par semaine, faisabilité ${draft.feasibility}/5`,
        relevant: draft.why.trim(),
        deadline: draft.deadline,
      },
      context: {
        what: draft.what.trim(),
        why: draft.why.trim(),
        how: draft.how.trim(),
        where: draft.where.trim() || undefined,
        who: whoPhrase(draft),
        howMuch: draft.time ?? undefined,
      },
    };
    const marker = {
      name: draft.measureName.trim(),
      unit: draft.unit.trim(),
      baseline,
      target,
      direction: draft.direction,
      aggregation: draft.aggregation,
    };
    try {
      const id = await run(async (repo) => {
        if (editing) {
          await repo.updateGoal(editing.id, goalFields);
          const markers = data.markers.filter((m) => m.goalId === editing.id).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
          const [first, ...rest] = markers;
          await repo.saveMarkers(editing.id, [
            { ...marker, id: first?.id },
            ...rest.map(({ id, name, unit, baseline: b, target: t, direction, aggregation }) => ({ id, name, unit, baseline: b, target: t, direction, aggregation })),
          ]);
          return editing.id;
        }
        const goal = await repo.createGoal({ ...goalFields, status: "active" });
        await repo.saveMarkers(goal.id, [marker]);
        const recipe = draft.recipeId ? data.recipes.find((r) => r.id === draft.recipeId) : undefined;
        if (recipe?.steps.length) {
          await repo.saveWeekPlan(
            goal.id,
            weekStart(new Date()),
            recipe.steps.slice(0, 3).map((label) => ({ label: label.slice(0, 120), targetCount: 1 })),
          );
        }
        return goal.id;
      });
      clearDraft(draftName);
      if (editing) {
        toast("Objectif modifié.", { tone: "success" });
        router.push(`/objectifs/${id}`);
      } else {
        setCreatedId(id);
        router.replace(`${base}?etape=fin&id=${id}`);
      }
    } catch {
      toast("On n'a pas pu enregistrer ton objectif. Réessaie.", { tone: "attention" });
    } finally {
      setSaving(false);
    }
  };

  const close = () => router.push(editing ? `/objectifs/${editing.id}` : "/objectifs");

  if (step === 9) {
    const id = createdId;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 text-center">
        <span className="anim-celebrate">
          <IconCircle icon={Flag} />
        </span>
        <StepQuestion size="display">Ton objectif est posé.</StepQuestion>
        <p className="-mt-6 text-body text-ink-muted">Maintenant, choisissons tes premières actions de la semaine.</p>
        <div className="w-full space-y-2">
          <LinkButton href={id ? `/objectifs/${id}/plan` : "/"} variant="primary" fullWidth>
            Faire mon plan
          </LinkButton>
          <LinkButton href="/" fullWidth>
            Plus tard
          </LinkButton>
        </div>
      </div>
    );
  }

  if (!draft) return null;
  const ok = canContinue(step, draft);
  const idees = ia && ia.pour === draft.what ? ia.idees : null;
  const iaEntree = (): IaEntree => ({
    etape: "objectif",
    objectif: draft.what.trim().slice(0, 120),
    pourquoi: draft.why.trim().slice(0, 200) || undefined,
    comment: draft.how.trim().slice(0, 1000) || undefined,
  });
  const comments = fusionnerSansDoublons(idees?.comment ?? [], profil.exemplesComment).slice(0, 6);
  const iaBouton = <IdeesIa entree={iaEntree} onIdees={(s) => setIa({ pour: draft.what, idees: s })} />;
  const repereIdees: RepereSuggere[] = [
    ...(idees?.reperes ?? []).map((r) => ({ nom: r.nom, unite: r.unite, sens: r.sens, regroupement: r.regroupement, cible: r.cible })),
    ...profil.reperes,
  ].filter((r, i, all) => all.findIndex((x) => memeLibelle(x.nom, r.nom)) === i && !memeLibelle(r.nom, draft.measureName));
  const daysToDeadline = draft.deadline ? daysBetween(today(), draft.deadline) : null;

  return (
    <div className="pb-sticky">
      <StepHeader step={step} total={TOTAL} onBack={step > 1 ? () => go(step - 1) : undefined} onClose={close} />

      {step === 1 && (
        <>
          <StepQuestion help="Dis-le avec tes mots. On le rendra plus précis ensemble.">Qu&apos;est-ce que tu veux atteindre ?</StepQuestion>
          <TextArea
            label="Ton objectif"
            hideLabel
            maxLength={120}
            placeholder="Ex. : courir 10 km sans m'arrêter"
            value={draft.what}
            onChange={(e) => update({ what: e.target.value, name: e.target.value.slice(0, 40) })}
          />
          <ChipGroup
            label="Exemples"
            className="mt-3"
            mode="multiple"
            value={[]}
            options={["Courir 10 km", "Lire 12 livres cette année", "Économiser 1 000 €", "Dormir avant 23 h"].map((v) => ({ value: v, label: v }))}
            onChange={(v) => update({ what: v, name: v.slice(0, 40) })}
          />
        </>
      )}

      {step === 2 && (
        <>
          <StepQuestion help="Ta raison profonde. C'est elle qui te portera les jours sans envie.">Pourquoi c&apos;est important pour toi ?</StepQuestion>
          <ProfilLine profil={profil} onChange={changeProfil} />
          <TextArea label="Ta raison" hideLabel maxLength={200} value={draft.why} onChange={(e) => update({ why: e.target.value })} />
          <ChipGroup
            label="Exemples"
            className="mt-3"
            mode="multiple"
            value={[]}
            options={fusionnerSansDoublons(idees?.raisons ?? [], profil.raisons)
              .slice(0, 8)
              .map((v) => ({ value: v, label: v }))}
            onChange={(v) => update({ why: v })}
          />
          <div className="mt-4">{iaBouton}</div>
        </>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <StepQuestion help="Choisis un chiffre que tu peux vérifier. Ce sera ton repère principal.">Comment sauras-tu que c&apos;est réussi ?</StepQuestion>
          <ProfilLine profil={profil} onChange={changeProfil} />
          <TextField label="Ce que tu comptes" placeholder={`Ex. : ${profil.reperes[0].nom}`} maxLength={120} value={draft.measureName} onChange={(e) => update({ measureName: e.target.value })} />
          <TextField label="Ton but" inputMode="decimal" placeholder={`Ex. : ${nombre(profil.reperes[0].cible)}`} value={draft.target} onChange={(e) => update({ target: e.target.value })} suffix={draft.unit || undefined} />
          <div className="space-y-1">
            <TextField label="Unité" maxLength={20} value={draft.unit} onChange={(e) => update({ unit: e.target.value })} />
            <ChipGroup
              label="Unités fréquentes"
              value={draft.unit}
              options={fusionnerSansDoublons(idees?.reperes.map((r) => r.unite) ?? [], profil.unites)
                .slice(0, 6)
                .map((v) => ({ value: v, label: v }))}
              onChange={(v) => update({ unit: v })}
            />
          </div>
          {repereIdees.length > 0 && (
            <ChipGroup
              label="Autres repères possibles"
              mode="multiple"
              value={[]}
              options={repereIdees.map((r) => ({ value: r.nom, label: `${r.nom} (${r.unite})` }))}
              onChange={(nom) => {
                const r = repereIdees.find((x) => x.nom === nom);
                if (r) update({ measureName: r.nom, unit: r.unite, direction: r.sens, aggregation: r.regroupement, target: String(r.cible).replace(".", ",") });
              }}
            />
          )}
          {iaBouton}
          <TextField
            label="Où en es-tu aujourd'hui ?"
            hint="Facultatif. Sert de point de départ pour voir le chemin parcouru."
            inputMode="decimal"
            placeholder="0"
            value={draft.baseline}
            onChange={(e) => update({ baseline: e.target.value })}
            suffix={draft.unit || undefined}
          />
          <SegmentedControl
            label="Sens du repère"
            options={[
              { value: "up", label: "Plus c'est haut, mieux c'est" },
              { value: "down", label: "Plus c'est bas, mieux c'est" },
            ]}
            value={draft.direction}
            onChange={(v) => update({ direction: v })}
          />
          <div className="space-y-1">
            <p className="text-small font-semibold">Quand tu notes plusieurs valeurs dans la semaine, on…</p>
            <ChipGroup
              label="Regroupement des valeurs de la semaine"
              value={draft.aggregation}
              options={[
                { value: "sum", label: "les additionne" },
                { value: "avg", label: "fait la moyenne" },
                { value: "last", label: "garde la dernière" },
              ]}
              onChange={(v) => update({ aggregation: v })}
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <StepQuestion help="Une date un peu ambitieuse mais tenable. Tu pourras la changer.">Pour quand ?</StepQuestion>
          <ChipGroup
            label="Échéance"
            value={draft.deadlineChoice}
            options={[
              { value: "1m", label: "Dans 1 mois" },
              { value: "3m", label: "Dans 3 mois" },
              { value: "6m", label: "Dans 6 mois" },
              { value: "date", label: "Choisir une date" },
            ]}
            onChange={(v) =>
              update({ deadlineChoice: v, deadline: v === "date" ? draft.deadline || monthsFromNow(2) : monthsFromNow(v === "1m" ? 1 : v === "3m" ? 3 : 6) })
            }
          />
          {draft.deadlineChoice === "date" && (
            <TextField label="Date" type="date" min={addDays(today(), 1)} value={draft.deadline} onChange={(e) => update({ deadline: e.target.value })} />
          )}
          {daysToDeadline != null && daysToDeadline > 0 && daysToDeadline < 14 && (
            <p className="rounded-md bg-attention-soft p-3 text-small text-ink">C&apos;est très proche. Tu es sûr·e ? Tu peux garder cette date.</p>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <StepQuestion help="Une idée suffit, même petite.">Comment tu vas t&apos;y prendre, et où ?</StepQuestion>
          <ProfilLine profil={profil} onChange={changeProfil} />
          <div className="space-y-1">
            <TextArea label="Comment" maxLength={1000} placeholder={`Ex. : ${profil.exemplesComment[0]}`} value={draft.how} onChange={(e) => update({ how: e.target.value })} />
            <ChipGroup
              label="Idées"
              mode="multiple"
              value={comments.filter((v) => draft.how.toLowerCase().includes(v.toLowerCase()))}
              options={comments.map((v) => ({ value: v, label: v }))}
              onChange={(v) => update({ how: draft.how.toLowerCase().includes(v.toLowerCase()) ? draft.how : draft.how.trim() ? `${draft.how.trim()}, ${v.charAt(0).toLowerCase()}${v.slice(1)}` : v })}
            />
          </div>
          <div className="space-y-1">
            <TextField label="Où" hint="Facultatif" maxLength={120} placeholder={`Ex. : ${profil.lieux.slice(0, 2).join(", ").toLowerCase()}`} value={draft.where} onChange={(e) => update({ where: e.target.value })} />
            <ChipGroup label="Lieux" value={draft.where} options={profil.lieux.map((v) => ({ value: v, label: v }))} onChange={(v) => update({ where: v })} />
          </div>
          {iaBouton}
        </div>
      )}

      {step === 6 && (
        <div className="space-y-3">
          <StepQuestion help="Être accompagné·e aide beaucoup. Seul·e, ça marche aussi.">Avec qui ?</StepQuestion>
          <div role="radiogroup" aria-label="Avec qui" className="space-y-3">
            <ChoiceCard icon={<User />} title="Seul·e" selected={draft.whoMode === "seul"} onSelect={() => update({ whoMode: "seul" })} />
            <ChoiceCard icon={<Users />} title="Avec quelqu'un" selected={draft.whoMode === "avec"} onSelect={() => update({ whoMode: "avec" })} />
            <ChoiceCard icon={<UsersRound />} title="En groupe ou en club" selected={draft.whoMode === "groupe"} onSelect={() => update({ whoMode: "groupe" })} />
          </div>
          {draft.whoMode === "avec" && <TextField label="Qui ?" hint="Facultatif" maxLength={120} value={draft.whoName} onChange={(e) => update({ whoName: e.target.value })} />}
        </div>
      )}

      {step === 7 && (
        <div className="space-y-6">
          <StepQuestion help="Sois honnête : mieux vaut peu et tenu que beaucoup et lâché.">Combien de temps par semaine peux-tu y consacrer ?</StepQuestion>
          <ChipGroup
            label="Temps par semaine"
            value={draft.time}
            options={(["30 min", "1 h", "2 h", "3 h ou plus"] as const).map((v) => ({ value: v, label: v }))}
            onChange={(v) => update({ time: v })}
          />
          <div className="space-y-3">
            <h2 className="text-heading">À quel point ça te semble faisable ?</h2>
            <RatingScale label="À quel point ça te semble faisable ?" value={draft.feasibility} onChange={(n) => update({ feasibility: n })} minLabel="Pas sûr du tout" maxLabel="Tout à fait" />
          </div>
          {draft.feasibility != null && draft.feasibility <= 2 && (
            <Banner tone="info" text="Et si on visait un peu plus petit pour commencer ? Réussir une première marche donne de l'élan.">
              <button type="button" className="min-h-11 text-small font-semibold text-primary underline" onClick={() => go(3)}>
                Modifier mon but
              </button>
            </Banner>
          )}
        </div>
      )}

      {step === 8 && (
        <div className="space-y-4">
          <StepQuestion help="Relis-le. S'il te ressemble, on passe au plan.">Voici ton objectif</StepQuestion>
          <div className="card">
            <GoalSummary input={summary} onEdit={go} />
          </div>
          <TextField label="Un nom court" maxLength={120} value={draft.name} onChange={(e) => update({ name: e.target.value })} />
        </div>
      )}

      <StickyFooter>
        {step === 8 ? (
          <>
            <Button fullWidth loading={saving} disabled={!ok} onClick={save}>
              {editing ? "Enregistrer" : "C'est mon objectif"}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => go(1)}>
              Modifier
            </Button>
          </>
        ) : (
          <>
            <Button fullWidth disabled={!ok} aria-describedby={!ok ? "continue-help" : undefined} onClick={() => go(step + 1)}>
              Continuer
            </Button>
            {!ok && (
              <p id="continue-help" className="text-center text-small text-ink-muted">
                Réponds pour continuer.
              </p>
            )}
          </>
        )}
      </StickyFooter>

      <BottomSheet open={!!resumeOffer} title="Reprendre là où tu t'étais arrêté ?" onClose={() => setResumeOffer(null)}>
        <Button
          fullWidth
          onClick={() => {
            if (!resumeOffer) return;
            setDraft(resumeOffer);
            setResumeOffer(null);
            router.replace(`${base}?etape=${resumeOffer.step}`);
          }}
        >
          Reprendre
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            clearDraft(draftName);
            setResumeOffer(null);
            router.replace(`${base}?etape=1`);
          }}
        >
          Recommencer
        </Button>
      </BottomSheet>
    </div>
  );
}
