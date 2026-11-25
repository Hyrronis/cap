/**
 * Calculs du domaine « Cap » : fonctions pures, sans dépendance, sans accès
 * au stockage ni à l'horloge (la date de référence est toujours passée en
 * paramètre quand elle compte). Voir docs/donnees.md.
 */
import type {
  ActionLog,
  Cause,
  CauseFamily,
  Goal,
  IsoDate,
  Marker,
  MarkerAggregation,
  Measurement,
  PlannedAction,
  RootCauseAnalysis,
  WeeklyReview,
} from './types.ts';

/* ------------------------------------------------------------------ */
/* Dates (fuseau local, semaines du lundi au dimanche)                 */
/* ------------------------------------------------------------------ */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Date JS → « yyyy-mm-dd » selon le fuseau local (pas toISOString, qui est en UTC). */
export function toIsoDate(date: Date): IsoDate {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Vrai si la chaîne est une date civile valide « yyyy-mm-dd ». */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toIsoDate(d) === value;
}

/** « yyyy-mm-dd » → Date à minuit local. Lève une erreur si invalide. */
export function parseIsoDate(value: IsoDate): Date {
  if (!isIsoDate(value)) throw new RangeError(`Date invalide : ${value}`);
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Horodatage ISO complet → date civile locale « yyyy-mm-dd ». */
export function localDateOf(dateTime: string): IsoDate {
  if (isIsoDate(dateTime)) return dateTime;
  const d = new Date(dateTime);
  if (Number.isNaN(d.getTime())) throw new RangeError(`Horodatage invalide : ${dateTime}`);
  return toIsoDate(d);
}

function asDate(value: Date | IsoDate): Date {
  return typeof value === 'string' ? parseIsoDate(value) : value;
}

/** Ajoute n jours à une date civile (insensible aux changements d'heure). */
export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(date);
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

/** Nombre de jours civils de a vers b (b - a). */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  const da = parseIsoDate(a);
  const db = parseIsoDate(b);
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

/** Lundi de la semaine contenant `date` (fuseau local), au format yyyy-mm-dd. */
export function weekStart(date: Date | IsoDate): IsoDate {
  const d = asDate(date);
  const offset = (d.getDay() + 6) % 7; // lundi = 0 … dimanche = 6
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset));
}

/** Dimanche de la semaine contenant `date`. */
export function weekEnd(date: Date | IsoDate): IsoDate {
  return addDays(weekStart(date), 6);
}

/** Vrai si `date` appartient à la semaine qui commence le lundi `start`. */
export function isInWeek(date: IsoDate, start: IsoDate): boolean {
  const diff = daysBetween(start, date);
  return diff >= 0 && diff <= 6;
}

/** Lundis des `count` dernières semaines, de la plus ancienne à celle de `ref` incluse. */
export function lastWeekStarts(ref: Date | IsoDate, count: number): IsoDate[] {
  const end = weekStart(ref);
  const out: IsoDate[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(addDays(end, -7 * i));
  return out;
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/* ------------------------------------------------------------------ */
/* Taux de réalisation des actions                                     */
/* ------------------------------------------------------------------ */

export interface CompletionRate {
  /** Nombre de réalisations comptées (plafonné à la cible de chaque action). */
  done: number;
  /** Somme des cibles (targetCount) des actions. */
  planned: number;
  /** done / planned, entre 0 et 1 (0 si rien n'est prévu). */
  rate: number;
  /** Nombre d'actions dont la cible est entièrement atteinte. */
  actionsCompleted: number;
}

/**
 * Taux de réalisation des actions d'une semaine.
 * - Chaque action compte jusqu'à `targetCount` (faire 5 fois une action prévue 3 fois
 *   ne compense pas une autre action non faite).
 * - Si `weekStartDate` est fourni, seuls les logs datés de cette semaine comptent.
 */
export function actionCompletionRate(
  actions: readonly PlannedAction[],
  logs: readonly ActionLog[],
  weekStartDate?: IsoDate,
): CompletionRate {
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (weekStartDate && !isInWeek(log.date, weekStartDate)) continue;
    counts.set(log.actionId, (counts.get(log.actionId) ?? 0) + 1);
  }
  let done = 0;
  let planned = 0;
  let actionsCompleted = 0;
  for (const action of actions) {
    const target = Math.max(1, Math.floor(action.targetCount || 1));
    const count = Math.min(counts.get(action.id) ?? 0, target);
    planned += target;
    done += count;
    if (count >= target) actionsCompleted++;
  }
  return { done, planned, rate: planned === 0 ? 0 : done / planned, actionsCompleted };
}

/* ------------------------------------------------------------------ */
/* Repères : progression, série hebdomadaire, tendance                 */
/* ------------------------------------------------------------------ */

/**
 * Progression (0-100) d'un repère depuis sa valeur de départ vers sa cible.
 * - 'up'   : (valeur - départ) / (cible - départ)
 * - 'down' : (départ - valeur) / (départ - cible)
 * Bornée à [0, 100]. Si la cible n'est pas « devant » le départ (écart nul ou
 * inversé), on renvoie 100 si la cible est atteinte, sinon 0.
 */
export function markerProgress(
  marker: Pick<Marker, 'baseline' | 'target' | 'direction'>,
  currentValue: number | null | undefined,
): number {
  if (currentValue == null || !Number.isFinite(currentValue)) return 0;
  const { baseline, target, direction } = marker;
  const span = direction === 'up' ? target - baseline : baseline - target;
  const reached = direction === 'up' ? currentValue >= target : currentValue <= target;
  if (!(span > 0)) return reached ? 100 : 0;
  const gained = direction === 'up' ? currentValue - baseline : baseline - currentValue;
  return clamp((gained / span) * 100, 0, 100);
}

/** Dernière mesure (par date puis par createdAt) d'un repère, ou null. */
export function latestMeasurement(
  measurements: readonly Measurement[],
  markerId?: string,
): Measurement | null {
  let best: Measurement | null = null;
  for (const m of measurements) {
    if (markerId && m.markerId !== markerId) continue;
    if (
      !best ||
      m.date > best.date ||
      (m.date === best.date && m.createdAt > best.createdAt)
    ) {
      best = m;
    }
  }
  return best;
}

/** Alias historique : même valeurs que `Marker.aggregation`. */
export type WeeklyAggregate = MarkerAggregation;

export interface WeeklyPoint {
  /** Lundi de la semaine. */
  weekStart: IsoDate;
  /** Valeur agrégée de la semaine, null si aucune mesure (trou dans le graphique). */
  value: number | null;
  /** Nombre de mesures dans la semaine. */
  count: number;
}

export interface WeeklySeriesOptions {
  /** Date de référence (incluse) : la série se termine sur sa semaine. */
  ref: Date | IsoDate;
  /** Nombre de semaines (défaut 8). */
  weeks?: number;
  /** Agrégation hebdo (défaut 'avg'). Pour un repère, utiliser `marker.aggregation` (cf. markerWeeklySeries). */
  aggregate?: WeeklyAggregate;
  /** Ne garder que les mesures de ce repère. */
  markerId?: string;
}

/** Série hebdomadaire prête pour un graphique (une entrée par semaine, trous = null). */
export function weeklySeries(
  measurements: readonly Measurement[],
  options: WeeklySeriesOptions,
): WeeklyPoint[] {
  const { ref, weeks = 8, aggregate = 'avg', markerId } = options;
  const starts = lastWeekStarts(ref, weeks);
  const buckets = new Map<IsoDate, Measurement[]>(starts.map((s) => [s, []]));
  for (const m of measurements) {
    if (markerId && m.markerId !== markerId) continue;
    if (!Number.isFinite(m.value)) continue;
    const bucket = buckets.get(weekStart(m.date));
    if (bucket) bucket.push(m);
  }
  return starts.map((s) => {
    const items = buckets.get(s) ?? [];
    return { weekStart: s, value: aggregateValues(items, aggregate), count: items.length };
  });
}

/** Regroupe des mesures selon l'agrégation (null si aucune mesure). */
export function aggregateValues(
  items: readonly Measurement[],
  aggregation: MarkerAggregation,
): number | null {
  const valid = items.filter((m) => Number.isFinite(m.value));
  if (valid.length === 0) return null;
  if (aggregation === 'last') return latestMeasurement(valid)!.value;
  const sum = valid.reduce((acc, m) => acc + m.value, 0);
  return aggregation === 'sum' ? sum : sum / valid.length;
}

/** Série hebdomadaire d'un repère, regroupée selon `marker.aggregation`. */
export function markerWeeklySeries(
  marker: Pick<Marker, 'id' | 'aggregation'>,
  measurements: readonly Measurement[],
  ref: Date | IsoDate,
  weeks = 8,
): WeeklyPoint[] {
  return weeklySeries(measurements, { ref, weeks, aggregate: marker.aggregation, markerId: marker.id });
}

export interface MarkerCurrent {
  /** Valeur actuelle du repère (null si aucune mesure). */
  value: number | null;
  /** Lundi de la semaine d'où vient la valeur. */
  weekStart: IsoDate | null;
  /** Vrai si cette semaine est celle de `ref` (donc peut-être incomplète pour 'sum'). */
  inProgress: boolean;
}

/**
 * Valeur actuelle d'un repère = agrégat (selon `marker.aggregation`) de la
 * semaine la plus récente qui a des mesures, jusqu'à la semaine de `ref` incluse.
 * - 'last' : dernière valeur notée ;
 * - 'avg'  : moyenne de cette semaine ;
 * - 'sum'  : total de cette semaine (cible hebdomadaire).
 */
export function markerCurrentValue(
  marker: Pick<Marker, 'id' | 'aggregation'>,
  measurements: readonly Measurement[],
  ref?: Date | IsoDate,
): MarkerCurrent {
  const limit = ref == null ? null : weekEnd(ref);
  const own = measurements.filter(
    (m) => m.markerId === marker.id && Number.isFinite(m.value) && (limit == null || m.date <= limit),
  );
  const last = latestMeasurement(own);
  if (!last) return { value: null, weekStart: null, inProgress: false };
  const ws = weekStart(last.date);
  const value = aggregateValues(own.filter((m) => isInWeek(m.date, ws)), marker.aggregation);
  return { value, weekStart: ws, inProgress: ref != null && ws === weekStart(ref) };
}

/**
 * Progression (0-100) d'un repère à partir de ses mesures, en respectant son
 * agrégation : combine `markerCurrentValue` et `markerProgress`.
 */
export function markerGoalProgress(
  marker: Pick<Marker, 'id' | 'aggregation' | 'baseline' | 'target' | 'direction'>,
  measurements: readonly Measurement[],
  ref?: Date | IsoDate,
): number {
  return markerProgress(marker, markerCurrentValue(marker, measurements, ref).value);
}

/** Pente (moindres carrés) de y en fonction de x. null si moins de 2 points. */
export function linearSlope(points: ReadonlyArray<{ x: number; y: number }>): number | null {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

export type TrendLabel = 'better' | 'worse' | 'flat' | 'unknown';

export interface MarkerTrend {
  /** Valeurs hebdomadaires selon `marker.aggregation` (null = semaine sans mesure). */
  points: WeeklyPoint[];
  /** Pente brute en unité du repère par semaine (null si < 2 semaines mesurées). */
  slopePerWeek: number | null;
  /** Lecture orientée par la direction du repère. */
  label: TrendLabel;
}

/**
 * Tendance d'un repère sur N semaines : valeur hebdomadaire (selon
 * `marker.aggregation`) puis pente simple
 * (régression linéaire sur les semaines mesurées, x = index de semaine).
 * La pente est jugée « plate » si |pente| < `flatRatio` × |cible - départ| par semaine.
 * Pour un repère 'sum', la semaine en cours (incomplète) n'entre pas dans la pente.
 */
export function markerTrend(
  marker: Pick<Marker, 'id' | 'baseline' | 'target' | 'direction' | 'aggregation'>,
  measurements: readonly Measurement[],
  ref: Date | IsoDate,
  weeks = 4,
  flatRatio = 0.01,
): MarkerTrend {
  const points = markerWeeklySeries(marker, measurements, ref, weeks);
  // Pour un total hebdo ('sum'), la semaine de `ref` est incomplète : on l'exclut de la pente.
  const currentWeek = weekStart(ref);
  const xy = points.flatMap((p, i) =>
    p.value == null || (marker.aggregation === 'sum' && p.weekStart === currentWeek)
      ? []
      : [{ x: i, y: p.value }],
  );
  const slopePerWeek = linearSlope(xy);
  let label: TrendLabel = 'unknown';
  if (slopePerWeek != null) {
    const scale = Math.abs(marker.target - marker.baseline) || 1;
    if (Math.abs(slopePerWeek) < flatRatio * scale) label = 'flat';
    else {
      const rising = slopePerWeek > 0;
      label = rising === (marker.direction === 'up') ? 'better' : 'worse';
    }
  }
  return { points, slopePerWeek, label };
}

/* ------------------------------------------------------------------ */
/* Règle « 2 semaines bloquées d'affilée → Creuser la cause »          */
/* ------------------------------------------------------------------ */

export interface DigSuggestion {
  suggest: boolean;
  /** Nombre de semaines bloquées consécutives jusqu'au dernier bilan. */
  stuckStreak: number;
  /** Bilan le plus récent pris en compte. */
  lastReviewId?: string;
}

/**
 * Propose « Creuser la cause » quand les bilans des 2 dernières semaines
 * consécutives (au moins) d'un objectif sont 'stuck'.
 * - Les semaines doivent se suivre (écart de 7 jours) : un trou casse la série.
 * - Si une analyse de causes a déjà été faite pour cet objectif après le début
 *   de la série bloquée, on ne repropose pas (on ne harcèle pas).
 */
export function shouldSuggestDigging(
  goalId: string,
  reviews: readonly WeeklyReview[],
  analyses: readonly RootCauseAnalysis[] = [],
  minStuckWeeks = 2,
): DigSuggestion {
  // Un seul bilan par semaine : on garde le plus récent.
  const byWeek = new Map<IsoDate, WeeklyReview>();
  for (const r of reviews) {
    if (r.goalId !== goalId) continue;
    const prev = byWeek.get(r.weekStart);
    if (!prev || r.createdAt > prev.createdAt) byWeek.set(r.weekStart, r);
  }
  const sorted = [...byWeek.values()].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  if (sorted.length === 0) return { suggest: false, stuckStreak: 0 };

  let stuckStreak = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].verdict !== 'stuck') break;
    if (i > 0 && daysBetween(sorted[i].weekStart, sorted[i - 1].weekStart) !== 7) break;
    stuckStreak++;
  }
  const last = sorted[0];
  if (stuckStreak < minStuckWeeks) {
    return { suggest: false, stuckStreak, lastReviewId: last.id };
  }
  const streakStartWeek = sorted[stuckStreak - 1].weekStart;
  const alreadyDug = analyses.some(
    (a) => a.goalId === goalId && localDateOf(a.createdAt) >= streakStartWeek,
  );
  return { suggest: !alreadyDug, stuckStreak, lastReviewId: last.id };
}

/* ------------------------------------------------------------------ */
/* Pareto des causes (« ce qui pèse le plus »)                         */
/* ------------------------------------------------------------------ */

export interface ParetoItem<T> {
  item: T;
  weight: number;
  /** Part de ce poids dans le total (0-1). */
  share: number;
  /** Part cumulée après cet élément (0-1). */
  cumulativeShare: number;
  /** Fait partie des causes qui pèsent ~80 %. */
  selected: boolean;
}

export interface ParetoResult<T> {
  items: ParetoItem<T>[];
  selected: T[];
  total: number;
}

/**
 * Pareto générique : tri par poids décroissant (stable), part et part cumulée,
 * sélection des premiers éléments jusqu'à atteindre `threshold` (inclus
 * l'élément qui franchit le seuil). Les poids ≤ 0 ou non finis sont ignorés.
 */
export function pareto<T>(
  entries: readonly T[],
  weightOf: (entry: T) => number,
  threshold = 0.8,
): ParetoResult<T> {
  const valid = entries
    .map((item, index) => ({ item, index, weight: weightOf(item) }))
    .filter((e) => Number.isFinite(e.weight) && e.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  const total = valid.reduce((acc, e) => acc + e.weight, 0);
  let cumulative = 0;
  let reached = false;
  const items: ParetoItem<T>[] = valid.map((e) => {
    const share = e.weight / total;
    const selected = !reached;
    cumulative += e.weight;
    const cumulativeShare = cumulative / total;
    if (cumulativeShare >= threshold - 1e-9) reached = true;
    return { item: e.item, weight: e.weight, share, cumulativeShare, selected };
  });
  return { items, selected: items.filter((i) => i.selected).map((i) => i.item), total };
}

/** Pareto des causes notées dans le « tour des causes ». */
export function paretoCauses(causes: readonly Cause[], threshold = 0.8): ParetoResult<Cause> {
  return pareto(causes, (c) => c.weight, threshold);
}

/** Pareto par famille (somme des poids par famille). */
export function paretoFamilies(
  causes: readonly Cause[],
  threshold = 0.8,
): ParetoResult<{ family: CauseFamily; weight: number }> {
  const sums = new Map<CauseFamily, number>();
  for (const c of causes) {
    if (Number.isFinite(c.weight) && c.weight > 0) {
      sums.set(c.family, (sums.get(c.family) ?? 0) + c.weight);
    }
  }
  const families = [...sums.entries()].map(([family, weight]) => ({ family, weight }));
  return pareto(families, (f) => f.weight, threshold);
}

/* ------------------------------------------------------------------ */
/* Série de semaines bouclées (streak)                                 */
/* ------------------------------------------------------------------ */

/**
 * Nombre de semaines consécutives « bouclées » (au moins un bilan fait) jusqu'à
 * la semaine de `ref`. La semaine en cours ne casse pas la série si son bilan
 * n'est pas encore fait : on compte alors à partir de la semaine précédente.
 * Passer des bilans filtrés pour un streak par objectif.
 */
export function reviewStreak(
  reviews: ReadonlyArray<Pick<WeeklyReview, 'weekStart'>>,
  ref: Date | IsoDate,
): number {
  const weeks = new Set(reviews.map((r) => weekStart(r.weekStart)));
  let cursor = weekStart(ref);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

/* ------------------------------------------------------------------ */
/* Score de clarté SMART                                               */
/* ------------------------------------------------------------------ */

export type SmartKey = 'specific' | 'measurable' | 'achievable' | 'relevant' | 'timeBound';

export const SMART_KEYS: readonly SmartKey[] = [
  'specific',
  'measurable',
  'achievable',
  'relevant',
  'timeBound',
];

/** Questions d'aide (tutoiement, sans jargon) affichées pour un critère manquant. */
export const SMART_HINTS: Readonly<Record<SmartKey, string>> = {
  specific: 'Dis précisément ce que tu veux obtenir.',
  measurable: 'Comment sauras-tu que tu y es ? Ajoute un chiffre ou un repère.',
  achievable: "Qu'est-ce qui rend ça faisable pour toi en ce moment ?",
  relevant: "Pourquoi c'est important pour toi ?",
  timeBound: "Pour quand ? Choisis une date, même approximative.",
};

export interface SmartClarity {
  /** 0 à 100, par pas de 20. */
  score: number;
  met: SmartKey[];
  missing: SmartKey[];
  /** Questions d'aide pour les critères manquants, dans l'ordre SMART. */
  hints: string[];
}

const hasText = (s: string | undefined, minWords = 1): boolean =>
  typeof s === 'string' && s.trim().split(/\s+/).filter(Boolean).length >= minWords;

/**
 * Score de clarté d'un objectif : 20 points par critère SMART rempli.
 * - specific   : titre ou précision d'au moins 3 mots
 * - measurable : texte contenant un chiffre, OU au moins un repère associé
 * - achievable / relevant : texte non vide
 * - timeBound  : échéance valide, postérieure à la création de l'objectif
 */
export function smartClarity(
  goal: Pick<Goal, 'title' | 'smart' | 'createdAt'>,
  markerCount = 0,
): SmartClarity {
  const s = goal.smart ?? {};
  const checks: Record<SmartKey, boolean> = {
    specific: hasText(s.specific, 3) || hasText(goal.title, 3),
    measurable: markerCount > 0 || (hasText(s.measurable) && /\d/.test(s.measurable!)),
    achievable: hasText(s.achievable),
    relevant: hasText(s.relevant),
    timeBound:
      isIsoDate(s.deadline) && (!goal.createdAt || s.deadline > localDateOf(goal.createdAt)),
  };
  const met = SMART_KEYS.filter((k) => checks[k]);
  const missing = SMART_KEYS.filter((k) => !checks[k]);
  return { score: met.length * 20, met, missing, hints: missing.map((k) => SMART_HINTS[k]) };
}
