/** Lectures dérivées des données, construites sur les fonctions de calculs.ts. */
import { addDays, actionCompletionRate, markerCurrentValue, shouldSuggestDigging, toIsoDate, weekStart } from "@/lib/domain/calculs";
import type { CapData, Goal, Id, IsoDate, Marker, PlannedAction, WeeklyReview } from "@/lib/domain/types";

export const today = (): IsoDate => toIsoDate(new Date());
export const thisWeek = (): IsoDate => weekStart(new Date());

/** Jour ISO (1 = lundi … 7 = dimanche). */
export const isoDay = (d: Date = new Date()): number => ((d.getDay() + 6) % 7) + 1;

export const goalById = (d: CapData, id: Id): Goal | undefined => d.goals.find((g) => g.id === id);
export const activeGoals = (d: CapData): Goal[] => d.goals.filter((g) => g.status === "active");

export const weekOf = (d: CapData, goalId: Id, ws: IsoDate) => d.weeks.find((w) => w.goalId === goalId && w.weekStart === ws);

export function actionsOf(d: CapData, goalId: Id, ws: IsoDate): PlannedAction[] {
  const week = weekOf(d, goalId, ws);
  if (!week) return [];
  return d.actions.filter((a) => a.weekId === week.id);
}

/** Dernière semaine (≤ ws) qui a un plan, pour préremplir. */
export function lastPlan(d: CapData, goalId: Id, ws: IsoDate): PlannedAction[] {
  const weeks = d.weeks.filter((w) => w.goalId === goalId && w.weekStart <= ws).sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  for (const w of weeks) {
    const acts = d.actions.filter((a) => a.weekId === w.id);
    if (acts.length) return acts;
  }
  return [];
}

export const markersOf = (d: CapData, goalId: Id): Marker[] =>
  d.markers.filter((m) => m.goalId === goalId).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

/** Le repère principal est le premier créé (étape 3 de l'assistant). */
export const primaryMarker = (d: CapData, goalId: Id): Marker | undefined => markersOf(d, goalId)[0];

export const reviewsOf = (d: CapData, goalId: Id): WeeklyReview[] =>
  d.reviews.filter((r) => r.goalId === goalId).sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));

export const reviewFor = (d: CapData, goalId: Id, ws: IsoDate) => d.reviews.find((r) => r.goalId === goalId && r.weekStart === ws);

export type GoalBadge = "progress" | "stuck" | "none";
export function goalBadge(d: CapData, goalId: Id): GoalBadge {
  const last = reviewsOf(d, goalId)[0];
  return last ? last.verdict : "none";
}

/**
 * Semaine à bilanter : la semaine en cours, sauf le lendemain du jour de bilan
 * (ex. lundi) si la semaine passée avait un plan sans bilan.
 */
export function reviewWeek(d: CapData, goalId: Id, reviewDay = 7, now = new Date()): IsoDate {
  const ws = weekStart(now);
  const prev = addDays(ws, -7);
  const lendemain = (reviewDay % 7) + 1;
  if (isoDay(now) === lendemain && lendemain === 1 && actionsOf(d, goalId, prev).length && !reviewFor(d, goalId, prev)) return prev;
  return ws;
}

/** Bilan dû : jour de bilan (ou son lendemain) et bilan pas encore fait. */
export function isReviewDue(d: CapData, goalId: Id, reviewDay = 7, now = new Date()): boolean {
  const day = isoDay(now);
  const lendemain = (reviewDay % 7) + 1;
  if (day !== reviewDay && day !== lendemain) return false;
  return !reviewFor(d, goalId, reviewWeek(d, goalId, reviewDay, now));
}

export const reviewsDueCount = (d: CapData, reviewDay = 7, now = new Date()) =>
  activeGoals(d).filter((g) => isReviewDue(d, g.id, reviewDay, now)).length;

export function weekRate(d: CapData, goalId: Id, ws: IsoDate) {
  return actionCompletionRate(actionsOf(d, goalId, ws), d.actionLogs, ws);
}

export function currentValue(d: CapData, m: Marker, ref: IsoDate = today()) {
  return markerCurrentValue(m, d.measurements, ref);
}

export function digSuggestion(d: CapData, goalId: Id) {
  return shouldSuggestDigging(goalId, d.reviews, d.rootCauseAnalyses);
}

/** Semaines restantes avant l'échéance (arrondi supérieur, jamais négatif). */
export function weeksLeft(deadline: IsoDate | undefined, from: IsoDate = today()): number | null {
  if (!deadline) return null;
  const [y, m, day] = deadline.split("-").map(Number);
  const [y2, m2, d2] = from.split("-").map(Number);
  const diff = (Date.UTC(y, m - 1, day) - Date.UTC(y2, m2 - 1, d2)) / 86_400_000;
  return Math.max(0, Math.ceil(diff / 7));
}
