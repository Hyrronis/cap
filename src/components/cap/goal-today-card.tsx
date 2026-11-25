"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ProgressRing } from "@/components/ui/feedback";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Goal, Marker, PlannedAction } from "@/lib/domain/types";
import { nombre } from "@/lib/format";
import { actionsOf, currentValue, markersOf, today, thisWeek, weekRate } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { isInWeek } from "@/lib/domain/calculs";

const CHEERS = ["Bien joué.", "Une de plus.", "C'est noté, bravo."];

export function GoalTodayCard({ goal, onNote }: { goal: Goal; onNote: (m: Marker) => void }) {
  const { data } = useStore();
  const ws = thisWeek();
  const actions = actionsOf(data, goal.id, ws);
  const rate = weekRate(data, goal.id, ws);
  const markers = markersOf(data, goal.id);
  const allDone = actions.length > 0 && rate.actionsCompleted === actions.length;

  return (
    <article className="card space-y-3" aria-labelledby={`goal-${goal.id}`}>
      <div className="flex items-center gap-3">
        <h2 id={`goal-${goal.id}`} className="line-clamp-2 flex-1 text-heading">
          <Link href={`/objectifs/${goal.id}`}>{goal.title}</Link>
        </h2>
        {actions.length > 0 && <ProgressRing value={rate.done} max={rate.planned} label={`${rate.done} sur ${rate.planned} cette semaine`} />}
      </div>

      {actions.length === 0 ? (
        <div className="space-y-2">
          <p className="text-body text-ink-muted">Il manque ton plan de la semaine.</p>
          <Link href={`/objectifs/${goal.id}/plan`} className={buttonClass("secondary", "sm")}>
            Faire mon plan
          </Link>
        </div>
      ) : (
        <ul className="-mx-2">
          {actions.map((a) => (
            <li key={a.id}>
              <ActionCheckItem action={a} allActions={actions} />
            </li>
          ))}
        </ul>
      )}
      {allDone && <p className="text-small text-ink-muted">Rien d&apos;autre aujourd&apos;hui. Profite.</p>}

      {markers.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Mes repères">
          {markers.map((m) => {
            const v = currentValue(data, m).value;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onNote(m)}
                  aria-label={v == null ? `Noter ${m.name}` : `${m.name} : ${nombre(v)} ${m.unit}. Noter une valeur`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-accent-soft px-3 text-small text-ink"
                >
                  <span>{m.name} :</span>
                  <span className="font-bold tabular-nums">{v == null ? "Noter" : `${nombre(v)} ${m.unit}`}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

export function ActionCheckItem({ action, allActions }: { action: PlannedAction; allActions: PlannedAction[] }) {
  const { data, run } = useStore();
  const toast = useToast();
  const cheer = useRef(0);
  const [pending, setPending] = useState<boolean | null>(null);
  const day = today();
  const ws = thisWeek();
  const logs = data.actionLogs.filter((l) => l.actionId === action.id && isInWeek(l.date, ws));
  const todayLog = logs.find((l) => l.date === day);
  const checked = pending ?? !!todayLog;
  const count = logs.length + (pending === true && !todayLog ? 1 : 0) - (pending === false && todayLog ? 1 : 0);
  const total = action.targetCount;
  const weekComplete = count >= total;

  const toggle = async () => {
    const willCheck = !checked;
    setPending(willCheck);
    try {
      if (willCheck) {
        await run((r) => r.addActionLog(action.id, day));
        const othersDone = allActions.every((a) => {
          if (a.id === action.id) return count + 1 >= total;
          const n = data.actionLogs.filter((l) => l.actionId === a.id && isInWeek(l.date, ws)).length;
          return n >= a.targetCount;
        });
        toast(othersDone ? "Tout ce que tu avais prévu cette semaine est fait. Chapeau." : CHEERS[cheer.current++ % CHEERS.length], { tone: "success" });
      } else if (todayLog) {
        await run((r) => r.removeActionLog(todayLog.id));
        toast("Action décochée");
      }
    } catch {
      toast("Ce n'est pas enregistré. Vérifie ta connexion et réessaie.", { tone: "attention", action: { label: "Réessayer", onClick: toggle } });
    } finally {
      setPending(null);
    }
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`${action.label}, ${count} sur ${total} cette semaine`}
      onClick={toggle}
      className="flex min-h-14 w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-muted"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
            checked ? "anim-pop border-success bg-success text-primary-on" : weekComplete ? "border-success text-success" : "border-border-strong"
          }`}
          aria-hidden="true"
        >
          {(checked || weekComplete) && <Check size={18} strokeWidth={3} />}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-ink">{action.label}</span>
        <span className="block text-small text-ink-muted">
          {count} sur {total} cette semaine
        </span>
      </span>
      {checked && <span className="shrink-0 text-small font-bold text-success">Fait</span>}
    </button>
  );
}
