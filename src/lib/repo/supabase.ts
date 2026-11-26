import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CapData,
  Goal,
  Id,
  IsoDate,
  Marker,
  PlannedAction,
  RootCauseAnalysis,
  Week,
  WeeklyReview,
} from "../domain/types.ts";
import {
  DB_LIMITS,
  GOAL_STATUS_FROM_DOMAIN,
  GOAL_STATUS_TO_DOMAIN,
  MARKER_DIRECTION_FROM_DOMAIN,
  MARKER_DIRECTION_TO_DOMAIN,
  VERDICT_FROM_DOMAIN,
  VERDICT_TO_DOMAIN,
  type BlockerAnalysisRow,
  type BlockerCauseRow,
  type BlockerWhyRow,
  type CycleRow,
  type Database,
  type GoalUpdate,
  type GoalRow,
  type LessonRow,
  type MarkerMeasurementRow,
  type MarkerRow,
  type PlannedActionRow,
  type RecipeRow,
  type WeeklyReviewRow,
} from "../db-types.ts";
import {
  actionDraftSchema,
  analysisInputSchema,
  capDataSchema,
  goalInputSchema,
  markerDraftSchema,
  measurementInputSchema,
  recipeInputSchema,
  reviewInputSchema,
  texteRequis,
  type GoalInput,
} from "./schemas.ts";
import { InvalidInputError, NotFoundError, type Repository } from "./types.ts";
import type { z } from "zod";

type Client = SupabaseClient<Database>;

function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const r = schema.safeParse(value);
  if (!r.success) throw new InvalidInputError();
  return r.data;
}

/** Erreur générique : on ne remonte jamais l'erreur Postgres brute à l'interface. */
function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw new Error("Échec de l'enregistrement.", { cause: res.error });
  return res.data;
}

const orUndef = <T>(v: T | null): T | undefined => (v === null ? undefined : v);
const orNull = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

/** Date civile → horodatage (midi local) : `achieved_on` n'est qu'une date. */
const dateToDateTime = (d: string): string => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day, 12).toISOString();
};
const dateTimeToDate = (dt: string): string => {
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ------------------------------------------------------------------ */
/* Correspondances ligne ↔ domaine                                     */
/* ------------------------------------------------------------------ */

function goalFromRow(r: GoalRow): Goal {
  const context = {
    who: orUndef(r.qq_who),
    what: orUndef(r.qq_what),
    where: orUndef(r.qq_where),
    when: orUndef(r.qq_when),
    how: orUndef(r.qq_how),
    howMuch: orUndef(r.qq_how_much),
    why: orUndef(r.why),
  };
  return {
    id: r.id,
    title: r.title,
    icon: orUndef(r.icon),
    smart: {
      specific: orUndef(r.smart_specific),
      measurable: orUndef(r.smart_measurable),
      achievable: orUndef(r.smart_achievable),
      relevant: orUndef(r.smart_relevant),
      deadline: orUndef(r.target_date),
    },
    context,
    status: GOAL_STATUS_TO_DOMAIN[r.status],
    createdAt: r.created_at,
    achievedAt: r.achieved_on ? dateToDateTime(r.achieved_on) : undefined,
  };
}

function goalToRow(g: Partial<GoalInput>): GoalUpdate {
  const row: GoalUpdate = {};
  if (g.title !== undefined) row.title = g.title;
  if ("icon" in g) row.icon = orNull(g.icon);
  // `profil` n'a pas de colonne : il est recalculé à partir du titre (domain/profils.ts).
  if (g.status !== undefined) {
    row.status = GOAL_STATUS_FROM_DOMAIN[g.status];
    row.achieved_on = g.status === "achieved" ? dateTimeToDate(g.achievedAt ?? new Date().toISOString()) : null;
  }
  if (g.smart) {
    row.smart_specific = orNull(g.smart.specific);
    row.smart_measurable = orNull(g.smart.measurable);
    row.smart_achievable = orNull(g.smart.achievable);
    row.smart_relevant = orNull(g.smart.relevant);
    row.target_date = orNull(g.smart.deadline);
  }
  if (g.context) {
    row.qq_who = orNull(g.context.who);
    row.qq_what = orNull(g.context.what);
    row.qq_where = orNull(g.context.where);
    row.qq_when = orNull(g.context.when);
    row.qq_how = orNull(g.context.how);
    row.qq_how_much = orNull(g.context.howMuch);
    row.why = orNull(g.context.why);
  }
  return row;
}

const weekFromRow = (r: CycleRow): Week => ({ id: r.id, goalId: r.goal_id, weekStart: r.week_start, focus: orUndef(r.focus) });

const actionFromRow = (r: PlannedActionRow, goalId: Id): PlannedAction => ({
  id: r.id,
  goalId,
  weekId: r.cycle_id,
  label: r.label,
  targetCount: r.target_count,
  days: r.days?.length ? r.days : undefined,
  createdAt: r.created_at,
});

const markerFromRow = (r: MarkerRow): Marker => ({
  id: r.id,
  goalId: r.goal_id,
  name: r.name,
  unit: r.unit ?? "",
  baseline: r.baseline ?? 0,
  target: r.target ?? r.baseline ?? 0,
  direction: MARKER_DIRECTION_TO_DOMAIN[r.direction],
  aggregation: r.aggregation,
  createdAt: r.created_at,
});

const reviewFromRow = (r: WeeklyReviewRow, cycle: CycleRow | undefined): WeeklyReview => ({
  id: r.id,
  goalId: cycle?.goal_id ?? "",
  weekId: r.cycle_id,
  weekStart: cycle?.week_start ?? "",
  whatWorked: r.what_worked ?? "",
  whatBlocked: r.what_blocked ?? "",
  whatIChange: r.what_i_change ?? "",
  verdict: VERDICT_TO_DOMAIN[r.verdict],
  createdAt: r.created_at,
});

function analysisFromRows(r: BlockerAnalysisRow, whys: BlockerWhyRow[], causes: BlockerCauseRow[]): RootCauseAnalysis {
  return {
    id: r.id,
    goalId: r.goal_id,
    reviewId: orUndef(r.review_id),
    problem: r.problem,
    whys: whys.filter((w) => w.analysis_id === r.id).sort((a, b) => a.position - b.position).map((w) => w.answer),
    causes: causes.filter((c) => c.analysis_id === r.id).map((c) => ({ family: c.family, label: c.label, weight: c.weight })),
    decision: orUndef(r.decision),
    createdAt: r.created_at,
  };
}

/* ------------------------------------------------------------------ */

/**
 * Implémentation Supabase. L'isolation par utilisateur repose sur la RLS :
 * `user_id` est rempli par la base (auth.uid()), jamais envoyé par l'app.
 */
export class SupabaseRepository implements Repository {
  readonly kind = "supabase" as const;
  private readonly db: Client;

  constructor(client: Client) {
    this.db = client;
  }

  async load(): Promise<CapData> {
    const [goals, cycles, actions, logs, markers, measures, reviews, analyses, whys, causes, lessons, recipes] =
      await Promise.all([
        this.db.from("goals").select("*").order("created_at"),
        this.db.from("cycles").select("*"),
        this.db.from("planned_actions").select("*").order("position"),
        this.db.from("action_logs").select("*"),
        this.db.from("markers").select("*").is("archived_at", null).order("created_at"),
        this.db.from("marker_measurements").select("*"),
        this.db.from("weekly_reviews").select("*"),
        this.db.from("blocker_analyses").select("*"),
        this.db.from("blocker_whys").select("*"),
        this.db.from("blocker_causes").select("*"),
        this.db.from("lessons").select("*").order("position"),
        this.db.from("recipes").select("*"),
      ]);
    const cycleRows = check(cycles) as CycleRow[];
    const cycleById = new Map(cycleRows.map((c) => [c.id, c]));
    const markerRows = check(markers) as MarkerRow[];
    const activeMarkers = new Set(markerRows.map((m) => m.id));
    const data: CapData = {
      goals: (check(goals) as GoalRow[]).map(goalFromRow),
      weeks: cycleRows.map(weekFromRow),
      actions: (check(actions) as PlannedActionRow[]).map((a) => actionFromRow(a, cycleById.get(a.cycle_id)?.goal_id ?? "")),
      actionLogs: (check(logs) as { id: string; action_id: string; done_on: string; note: string | null; created_at: string }[]).map(
        (l) => ({ id: l.id, actionId: l.action_id, date: l.done_on, note: orUndef(l.note), createdAt: l.created_at }),
      ),
      markers: markerRows.map(markerFromRow),
      measurements: (check(measures) as MarkerMeasurementRow[])
        .filter((m) => activeMarkers.has(m.marker_id))
        .map((m) => ({ id: m.id, markerId: m.marker_id, date: m.measured_on, value: Number(m.value), createdAt: m.created_at })),
      reviews: (check(reviews) as WeeklyReviewRow[]).map((r) => reviewFromRow(r, cycleById.get(r.cycle_id))),
      rootCauseAnalyses: (check(analyses) as BlockerAnalysisRow[]).map((a) =>
        analysisFromRows(a, check(whys) as BlockerWhyRow[], check(causes) as BlockerCauseRow[]),
      ),
      lessons: (check(lessons) as LessonRow[]).map((l) => ({ id: l.id, goalId: l.goal_id ?? "", text: l.content, createdAt: l.created_at })),
      recipes: (check(recipes) as RecipeRow[]).map((r) => ({
        id: r.id,
        goalId: orUndef(r.goal_id),
        title: r.title,
        steps: r.steps,
        when: orUndef(r.trigger_cue),
        createdAt: r.created_at,
      })),
    };
    // Même contrôle qu'en local : on n'affiche que des données conformes.
    const parsed = capDataSchema.safeParse(JSON.parse(JSON.stringify(data)));
    return parsed.success ? parsed.data : data;
  }

  async createGoal(input: GoalInput) {
    const clean = parse(goalInputSchema, input);
    const row = { ...goalToRow(clean), title: clean.title };
    const data = check(await this.db.from("goals").insert(row).select("*").single()) as GoalRow;
    return goalFromRow(data);
  }

  async updateGoal(id: Id, patch: Partial<GoalInput>) {
    const clean = parse(goalInputSchema.partial(), patch);
    const data = check(await this.db.from("goals").update(goalToRow(clean)).eq("id", id).select("*").maybeSingle()) as GoalRow | null;
    if (!data) throw new NotFoundError("Objectif", id);
    return goalFromRow(data);
  }

  async deleteGoal(id: Id) {
    check(await this.db.from("goals").delete().eq("id", id));
  }

  async ensureWeek(goalId: Id, weekStart: IsoDate) {
    const existing = check(
      await this.db.from("cycles").select("*").eq("goal_id", goalId).eq("week_start", weekStart).maybeSingle(),
    ) as CycleRow | null;
    if (existing) return weekFromRow(existing);
    const created = check(
      await this.db.from("cycles").insert({ goal_id: goalId, week_start: weekStart }).select("*").single(),
    ) as CycleRow;
    return weekFromRow(created);
  }

  async saveWeekPlan(goalId: Id, weekStart: IsoDate, actions: Parameters<Repository["saveWeekPlan"]>[2]) {
    const clean = actions.map((a) => parse(actionDraftSchema, a));
    const week = await this.ensureWeek(goalId, weekStart);
    const current = check(await this.db.from("planned_actions").select("id").eq("cycle_id", week.id)) as { id: string }[];
    const keep = new Set(clean.map((a) => a.id).filter(Boolean));
    const removed = current.map((a) => a.id).filter((x) => !keep.has(x));
    if (removed.length) check(await this.db.from("planned_actions").delete().in("id", removed));
    const out: PlannedAction[] = [];
    for (const [position, a] of clean.entries()) {
      const fields = { label: a.label, target_count: a.targetCount, days: a.days?.length ? a.days : null, position };
      const res =
        a.id && current.some((c) => c.id === a.id)
          ? await this.db.from("planned_actions").update(fields).eq("id", a.id).select("*").single()
          : await this.db.from("planned_actions").insert({ ...fields, cycle_id: week.id }).select("*").single();
      out.push(actionFromRow(check(res) as PlannedActionRow, goalId));
    }
    return out;
  }

  async saveMarkers(goalId: Id, markers: Parameters<Repository["saveMarkers"]>[1]) {
    const clean = markers.map((m) => parse(markerDraftSchema, m));
    const current = check(
      await this.db.from("markers").select("id").eq("goal_id", goalId).is("archived_at", null),
    ) as { id: string }[];
    const keep = new Set(clean.map((m) => m.id).filter(Boolean));
    const removed = current.map((m) => m.id).filter((x) => !keep.has(x));
    // Un repère retiré est archivé : son historique reste en base.
    if (removed.length) check(await this.db.from("markers").update({ archived_at: new Date().toISOString() }).in("id", removed));
    const out: Marker[] = [];
    for (const m of clean) {
      const fields = {
        name: m.name,
        unit: m.unit || null,
        baseline: m.baseline,
        target: m.target,
        direction: MARKER_DIRECTION_FROM_DOMAIN[m.direction],
        aggregation: m.aggregation,
      };
      const res =
        m.id && current.some((c) => c.id === m.id)
          ? await this.db.from("markers").update(fields).eq("id", m.id).select("*").single()
          : await this.db.from("markers").insert({ ...fields, goal_id: goalId }).select("*").single();
      out.push(markerFromRow(check(res) as MarkerRow));
    }
    return out;
  }

  async addActionLog(actionId: Id, date: IsoDate) {
    const { date: d } = parse(measurementInputSchema.pick({ date: true }), { date });
    const res = await this.db
      .from("action_logs")
      .upsert({ action_id: actionId, done_on: d }, { onConflict: "action_id,done_on" })
      .select("*")
      .single();
    const l = check(res) as { id: string; action_id: string; done_on: string; created_at: string };
    return { id: l.id, actionId: l.action_id, date: l.done_on, createdAt: l.created_at };
  }

  async removeActionLog(id: Id) {
    check(await this.db.from("action_logs").delete().eq("id", id));
  }

  async addMeasurement(input: Parameters<Repository["addMeasurement"]>[0]) {
    const c = parse(measurementInputSchema, input);
    const m = check(
      await this.db.from("marker_measurements").insert({ marker_id: c.markerId, value: c.value, measured_on: c.date }).select("*").single(),
    ) as MarkerMeasurementRow;
    return { id: m.id, markerId: m.marker_id, date: m.measured_on, value: Number(m.value), createdAt: m.created_at };
  }

  async saveReview(input: Parameters<Repository["saveReview"]>[0]) {
    const c = parse(reviewInputSchema, input);
    const week = await this.ensureWeek(c.goalId, c.weekStart);
    const row = check(
      await this.db
        .from("weekly_reviews")
        .upsert(
          {
            cycle_id: week.id,
            what_worked: c.whatWorked || null,
            what_blocked: c.whatBlocked || null,
            what_i_change: c.whatIChange || null,
            verdict: VERDICT_FROM_DOMAIN[c.verdict],
          },
          { onConflict: "cycle_id" },
        )
        .select("*")
        .single(),
    ) as WeeklyReviewRow;
    return reviewFromRow(row, { goal_id: c.goalId, week_start: c.weekStart } as CycleRow);
  }

  async createAnalysis(input: Parameters<Repository["createAnalysis"]>[0]) {
    const c = parse(analysisInputSchema, input);
    const a = check(
      await this.db
        .from("blocker_analyses")
        .insert({
          goal_id: c.goalId,
          review_id: orNull(c.reviewId),
          problem: c.problem,
          root_cause: c.whys.at(-1) ?? null,
          decision: orNull(c.decision),
        })
        .select("*")
        .single(),
    ) as BlockerAnalysisRow;
    if (c.whys.length) {
      check(await this.db.from("blocker_whys").insert(c.whys.map((answer, i) => ({ analysis_id: a.id, position: i + 1, answer }))));
    }
    if (c.causes.length) {
      check(await this.db.from("blocker_causes").insert(c.causes.map((x) => ({ analysis_id: a.id, ...x }))));
    }
    return { ...c, id: a.id, createdAt: a.created_at };
  }

  async createLessons(goalId: Id, texts: string[]) {
    const clean = texts.map((t) => parse(texteRequis(DB_LIMITS.longText), t));
    const rows = check(
      await this.db
        .from("lessons")
        .insert(clean.map((content, position) => ({ goal_id: goalId || null, content, position })))
        .select("*"),
    ) as LessonRow[];
    return rows.map((l) => ({ id: l.id, goalId: l.goal_id ?? "", text: l.content, createdAt: l.created_at }));
  }

  async createRecipe(input: Parameters<Repository["createRecipe"]>[0]) {
    const c = parse(recipeInputSchema, input);
    const r = check(
      await this.db
        .from("recipes")
        .insert({ goal_id: orNull(c.goalId), title: c.title, steps: c.steps, trigger_cue: orNull(c.when) })
        .select("*")
        .single(),
    ) as RecipeRow;
    return { id: r.id, goalId: orUndef(r.goal_id), title: r.title, steps: r.steps, when: orUndef(r.trigger_cue), createdAt: r.created_at };
  }

  async deleteRecipe(id: Id) {
    check(await this.db.from("recipes").delete().eq("id", id));
  }

  /**
   * Remplace toutes les données (exemples, import d'un export local) :
   * efface les objectifs (cascade) puis réinsère avec de nouveaux uuid.
   */
  async replaceAll(input: CapData) {
    const data = parse(capDataSchema, input);
    await this.clear();
    const ids = new Map<string, string>();
    const map = (old: string) => ids.get(old) ?? old;

    for (const g of data.goals) {
      const created = await this.createGoal({ ...g, achievedAt: g.achievedAt });
      ids.set(g.id, created.id);
    }
    for (const w of data.weeks) {
      const c = check(await this.db.from("cycles").insert({ goal_id: map(w.goalId), week_start: w.weekStart, focus: orNull(w.focus) }).select("id").single()) as { id: string };
      ids.set(w.id, c.id);
    }
    for (const [position, a] of data.actions.entries()) {
      const r = check(
        await this.db
          .from("planned_actions")
          .insert({ cycle_id: map(a.weekId), label: a.label, target_count: a.targetCount, days: a.days ?? null, position })
          .select("id")
          .single(),
      ) as { id: string };
      ids.set(a.id, r.id);
    }
    if (data.actionLogs.length) {
      check(await this.db.from("action_logs").insert(data.actionLogs.map((l) => ({ action_id: map(l.actionId), done_on: l.date, note: orNull(l.note) }))));
    }
    if (data.markers.length) {
      const created = await this.saveMarkersBulk(data.markers.map((m) => ({ ...m, goalId: map(m.goalId) })));
      data.markers.forEach((m, i) => ids.set(m.id, created[i]));
    }
    if (data.measurements.length) {
      check(await this.db.from("marker_measurements").insert(data.measurements.map((m) => ({ marker_id: map(m.markerId), value: m.value, measured_on: m.date }))));
    }
    for (const r of data.reviews) {
      const saved = await this.saveReview({ ...r, goalId: map(r.goalId) });
      ids.set(r.id, saved.id);
    }
    for (const a of data.rootCauseAnalyses) {
      await this.createAnalysis({ ...a, goalId: map(a.goalId), reviewId: a.reviewId ? map(a.reviewId) : undefined });
    }
    for (const l of data.lessons) await this.createLessons(map(l.goalId), [l.text]);
    for (const r of data.recipes) await this.createRecipe({ goalId: r.goalId ? map(r.goalId) : undefined, title: r.title, steps: r.steps, when: r.when });
  }

  private async saveMarkersBulk(markers: Marker[]): Promise<string[]> {
    const rows = check(
      await this.db
        .from("markers")
        .insert(
          markers.map((m) => ({
            goal_id: m.goalId,
            name: m.name,
            unit: m.unit || null,
            baseline: m.baseline,
            target: m.target,
            direction: MARKER_DIRECTION_FROM_DOMAIN[m.direction],
            aggregation: m.aggregation,
          })),
        )
        .select("id"),
    ) as { id: string }[];
    return rows.map((r) => r.id);
  }

  async exportData() {
    return check(await this.db.rpc("export_my_data"));
  }

  /** Efface le contenu (pas le compte) : objectifs en cascade + leçons et recettes. */
  async clear() {
    const uid = (await this.db.auth.getUser()).data.user?.id;
    if (!uid) throw new Error("Session expirée.");
    check(await this.db.from("goals").delete().eq("user_id", uid));
    check(await this.db.from("lessons").delete().eq("user_id", uid));
    check(await this.db.from("recipes").delete().eq("user_id", uid));
  }
}
