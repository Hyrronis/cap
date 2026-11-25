"use client";

import { Check, Trophy } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { ErrorState, IconCircle, Skeleton } from "@/components/ui/feedback";
import { ChipGroup, TextField } from "@/components/ui/form";
import { StepHeader, StepQuestion, StickyFooter } from "@/components/ui/layout";
import { useToast } from "@/components/ui/toast";
import { lastPlan, thisWeek } from "@/lib/selectors";
import { useStore } from "@/lib/store";

const LESSONS = ["Ce qui m'a le plus aidé", "Ce que je referais autrement", "Ce que je conseillerais à un ami"];
const MOMENTS = ["Le matin", "Le midi", "Le soir", "Le week-end"];
const CONFETTI = ["var(--color-accent)", "var(--color-primary)", "var(--color-success)", "var(--color-attention)"];

export default function RetenirPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { data, status, run, reload } = useStore();
  const goal = data.goals.find((g) => g.id === id);
  const etape = params.get("etape") ?? "bravo";

  const [lessons, setLessons] = useState(["", "", ""]);
  const [recipeName, setRecipeName] = useState<string | null>(null);
  const [kept, setKept] = useState<string[] | null>(null);
  const [moment, setMoment] = useState<string | null>(null);
  const [tip, setTip] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Objectif atteint ! · Cap";
  }, []);

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

  const plan = lastPlan(data, goal.id, thisWeek());
  const name = recipeName ?? `Ma recette : ${goal.title}`.slice(0, 120);
  const keptLabels = kept ?? plan.map((a) => a.label);
  const go = (e: string) => router.push(`/objectifs/${goal.id}/retenir?etape=${e}`);
  const close = () => router.push(`/objectifs/${goal.id}`);

  const markAchieved = async () => {
    try {
      if (goal.status !== "achieved") await run((r) => r.updateGoal(goal.id, { status: "achieved", achievedAt: new Date().toISOString() }));
      go("lecons");
    } catch {
      toast("Ce n'est pas enregistré. Vérifie ta connexion et réessaie.", { tone: "attention" });
    }
  };

  const finish = async (withRecipe: boolean) => {
    setSaving(true);
    try {
      await run(async (repo) => {
        const texts = lessons.map((l) => l.trim()).filter(Boolean);
        if (texts.length) await repo.createLessons(goal.id, texts);
        if (withRecipe) {
          const steps = [...keptLabels, ...(tip.trim() ? [`Astuce : ${tip.trim()}`] : [])].map((s) => s.slice(0, 120));
          await repo.createRecipe({ goalId: goal.id, title: name.trim() || goal.title, steps, when: moment ?? undefined });
        }
      });
      toast("Rangé dans ton carnet.", { tone: "success" });
      router.push(withRecipe ? "/carnet?vue=recettes" : "/carnet");
    } catch {
      toast("Ce n'est pas enregistré. Vérifie ta connexion et réessaie.", { tone: "attention" });
    } finally {
      setSaving(false);
    }
  };

  if (etape === "bravo") {
    return (
      <div className="relative flex min-h-dvh flex-col justify-center gap-5 overflow-hidden py-8 text-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} className="confetti" style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % 4], animationDelay: `${(i % 6) * 0.12}s` }} />
          ))}
        </div>
        <div className="anim-celebrate flex justify-center">
          <IconCircle icon={Trophy} tone="accent" />
        </div>
        <StepQuestion>Objectif atteint !</StepQuestion>
        <p className="-mt-6 text-body text-ink-muted">Tu l&apos;as fait : {goal.title}. Prends une seconde pour savourer.</p>
        <Button fullWidth onClick={markAchieved}>
          Continuer
        </Button>
      </div>
    );
  }

  if (etape === "lecons") {
    const ok = lessons.some((l) => l.trim());
    return (
      <div className="pb-sticky">
        <StepHeader step={1} total={2} onClose={close} />
        <StepQuestion help="3 leçons pour la prochaine fois. Une phrase chacune.">Ce que j&apos;en retiens</StepQuestion>
        <ol className="space-y-4">
          {LESSONS.map((label, i) => (
            <li key={label}>
              <TextField label={`${i + 1}. ${label}`} maxLength={1000} value={lessons[i]} onChange={(e) => setLessons((l) => l.map((x, j) => (j === i ? e.target.value : x)))} />
            </li>
          ))}
        </ol>
        <StickyFooter>
          <Button fullWidth disabled={!ok} onClick={() => go("recette")}>
            Continuer
          </Button>
        </StickyFooter>
      </div>
    );
  }

  return (
    <div className="pb-sticky">
      <StepHeader step={2} total={2} onBack={() => go("lecons")} onClose={close} />
      <StepQuestion help="Garde ce qui a fonctionné pour le réutiliser plus tard.">Ma recette qui marche</StepQuestion>
      <div className="space-y-5">
        <TextField label="Nom de la recette" maxLength={120} value={name} onChange={(e) => setRecipeName(e.target.value)} />
        {plan.length > 0 && (
          <fieldset className="space-y-1">
            <legend className="mb-1 text-body font-semibold">Ce que je garde</legend>
            {plan.map((a) => {
              const on = keptLabels.includes(a.label);
              return (
                <button
                  key={a.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setKept(on ? keptLabels.filter((l) => l !== a.label) : [...keptLabels, a.label])}
                  className="flex min-h-12 w-full items-center gap-3 rounded-md px-1 text-left"
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${on ? "border-success bg-success text-primary-on" : "border-border-strong"}`} aria-hidden="true">
                    {on && <Check size={16} strokeWidth={3} />}
                  </span>
                  {a.label}
                </button>
              );
            })}
          </fieldset>
        )}
        <div className="space-y-1">
          <p className="text-body font-semibold">Mon meilleur moment</p>
          <ChipGroup label="Mon meilleur moment" value={moment} options={MOMENTS.map((v) => ({ value: v, label: v }))} onChange={setMoment} />
        </div>
        <TextField label="Mon astuce" hint="Facultatif" maxLength={120} value={tip} onChange={(e) => setTip(e.target.value)} />
      </div>
      <StickyFooter>
        <Button variant="ghost" fullWidth onClick={() => finish(false)}>
          Passer
        </Button>
        <Button fullWidth loading={saving} onClick={() => finish(true)}>
          Enregistrer dans mon carnet
        </Button>
      </StickyFooter>
    </div>
  );
}
