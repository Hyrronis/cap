"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ProgressBar, StatusBadge, type GoalStatusLabel } from "@/components/ui/feedback";
import { paretoCauses } from "@/lib/domain/calculs";
import { CAUSE_FAMILY_LABELS, type Cause, type Goal } from "@/lib/domain/types";
import { date as fmtDate, nombre } from "@/lib/format";
import { currentValue, goalBadge, primaryMarker, weeksLeft } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { FamilyIcon } from "./family";

export function goalStatusLabel(goal: Goal, badge: GoalStatusLabel): GoalStatusLabel {
  if (goal.status === "achieved") return "achieved";
  if (goal.status === "paused" || goal.status === "abandoned") return "paused";
  return badge;
}

export function deadlineText(goal: Goal): string | null {
  const left = weeksLeft(goal.smart.deadline);
  if (!goal.smart.deadline) return null;
  if (left != null && left > 0 && left <= 26) return `Il reste ${left} semaine${left > 1 ? "s" : ""}`;
  return `Pour le ${fmtDate(goal.smart.deadline)}`;
}

export function GoalCard({ goal, href, right }: { goal: Goal; href: string; right?: ReactNode }) {
  const { data } = useStore();
  const marker = primaryMarker(data, goal.id);
  const value = marker ? currentValue(data, marker).value : null;
  const status = goalStatusLabel(goal, goalBadge(data, goal.id));
  const deadline = deadlineText(goal);
  return (
    <Link href={href} className="card flex items-center gap-3 hover:bg-surface-muted">
      <div className="min-w-0 flex-1 space-y-2">
        <h2 className="line-clamp-2 text-heading">{goal.title}</h2>
        <div className="flex flex-wrap items-center gap-2 text-small text-ink-muted">
          {right ?? <StatusBadge status={status} />}
          {deadline && <span>{deadline}</span>}
        </div>
        {marker && !right && (
          <div className="space-y-1">
            <ProgressBar
              value={Math.max(0, marker.direction === "up" ? (value ?? marker.baseline) - marker.baseline : marker.baseline - (value ?? marker.baseline))}
              max={Math.abs(marker.target - marker.baseline) || 1}
              label={`${marker.name} : ${nombre(value)} sur ${nombre(marker.target)} ${marker.unit}`}
              tone="accent"
            />
            <p className="text-small text-ink-muted tabular-nums">
              {nombre(value ?? marker.baseline)} / {nombre(marker.target)} {marker.unit}
            </p>
          </div>
        )}
      </div>
      <ChevronRight size={20} className="shrink-0 text-ink-muted" aria-hidden="true" />
    </Link>
  );
}

export interface SummaryInput {
  deadline?: string;
  what?: string;
  why?: string;
  measureName?: string;
  target?: number | null;
  unit?: string;
  how?: string;
  where?: string;
  who?: string;
  time?: string;
}

type Part = { text: string; step?: number; bold?: boolean };

export function summaryParts(s: SummaryInput): Part[] {
  const p: Part[] = [];
  const b = (text: string, step: number): Part => ({ text, step, bold: true });
  if (s.deadline) p.push({ text: "D'ici le " }, b(fmtDate(s.deadline), 4), { text: ", je veux " });
  else p.push({ text: "Je veux " });
  p.push(b((s.what ?? "").replace(/\.$/, "").toLowerCase().startsWith("je ") ? s.what! : lowerFirst(s.what ?? "…"), 1), { text: ". " });
  if (s.why) p.push({ text: "C'est important pour moi parce que " }, b(lowerFirst(s.why.replace(/\.$/, "")), 2), { text: ". " });
  if (s.measureName && s.target != null)
    p.push({ text: "Je saurai que c'est réussi quand " }, b(lowerFirst(s.measureName), 3), { text: " atteindra " }, b(`${nombre(s.target)} ${s.unit ?? ""}`.trim(), 3), { text: ". " });
  if (s.how) {
    p.push({ text: "Je m'y prends ainsi : " }, b(lowerFirst(s.how.replace(/\.$/, "")), 5));
    if (s.where) p.push({ text: ", " }, b(lowerFirst(s.where), 5));
    if (s.who) p.push({ text: ", " }, b(lowerFirst(s.who), 6));
    if (s.time) p.push({ text: ", avec environ " }, b(s.time, 7), { text: " par semaine" });
    p.push({ text: "." });
  }
  return p;
}

const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

export function GoalSummary({ input, onEdit }: { input: SummaryInput; onEdit?: (step: number) => void }) {
  return (
    <p className="text-body leading-7">
      {summaryParts(input).map((part, i) =>
        part.bold && onEdit && part.step ? (
          <button key={i} type="button" onClick={() => onEdit(part.step!)} aria-label={`Modifier : ${part.text}`} className="font-bold text-primary underline decoration-dotted underline-offset-4">
            {part.text}
          </button>
        ) : part.bold ? (
          <strong key={i}>{part.text}</strong>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  );
}

export function summaryFromGoal(goal: Goal, data: ReturnType<typeof useStore>["data"]): SummaryInput {
  const m = primaryMarker(data, goal.id);
  return {
    deadline: goal.smart.deadline,
    what: goal.context?.what ?? goal.smart.specific ?? goal.title,
    why: goal.context?.why ?? goal.smart.relevant,
    measureName: m?.name,
    target: m?.target,
    unit: m?.unit,
    how: goal.context?.how,
    where: goal.context?.where,
    who: goal.context?.who,
    time: goal.context?.howMuch,
  };
}

export function QuoteBubble({ children }: { children: ReactNode }) {
  return <blockquote className="rounded-md border-l-[3px] border-primary bg-surface-muted px-4 py-3 text-body">{children}</blockquote>;
}

export function WhyChain({ items }: { items: string[] }) {
  return (
    <ol className="relative space-y-3 border-l-2 border-border pl-5">
      {items.map((t, i) => {
        const last = i === items.length - 1;
        return (
          <li key={i} className="relative">
            <span className={`absolute top-2 -left-[27px] h-3 w-3 rounded-full ${last ? "bg-accent" : "bg-border-strong"}`} aria-hidden="true" />
            {last && <span className="mb-1 inline-block rounded-sm bg-accent-soft px-2 py-0.5 text-caption text-accent">Cause probable</span>}
            <p className={`text-body ${last ? "font-bold" : ""}`}>{t}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** « Ce qui pèse le plus » : barres HTML triées, top (~80 %, 1 à 3) en accent. */
export function ParetoChart({ causes }: { causes: Cause[] }) {
  const result = paretoCauses(causes);
  const topCount = Math.min(3, Math.max(1, result.selected.length));
  const max = Math.max(...result.items.map((i) => i.weight), 1);
  return (
    <ul className="space-y-2">
      {result.items.map((it, i) => {
        const top = i < topCount;
        return (
          <li key={`${it.item.label}-${i}`} aria-label={`${it.item.label} : poids ${it.weight} sur 5`} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-small">
              <span className={`flex items-center gap-1.5 ${top ? "font-semibold text-ink" : "text-ink-muted"}`}>
                <FamilyIcon family={it.item.family} size={16} />
                {it.item.label}
              </span>
              <span className={`tabular-nums ${top ? "font-bold" : "text-ink-muted"}`} aria-hidden="true">
                {it.weight}
              </span>
            </div>
            <div className="h-3 rounded-full bg-surface-muted" aria-hidden="true">
              <div className={`h-3 rounded-full ${top ? "bg-accent" : "bg-border"}`} style={{ width: `${(it.weight / max) * 100}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function paretoSentence(causes: Cause[]): { text: string; top: Cause[] } {
  const r = paretoCauses(causes);
  const top = r.items.slice(0, Math.min(3, Math.max(1, r.selected.length)));
  const share = top.length ? top[top.length - 1].cumulativeShare : 0;
  const p = Math.round((share * 100) / 5) * 5;
  const k = top.length;
  const n = r.items.length;
  return {
    text: `${k} cause${k > 1 ? "s" : ""} sur ${n} pèse${k > 1 ? "nt" : ""} pour ${p} % de ton blocage. C'est là qu'agir changera le plus.`,
    top: top.map((t) => t.item),
  };
}

export const familyLabel = (f: Cause["family"]) => CAUSE_FAMILY_LABELS[f];
