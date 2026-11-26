/**
 * Schémas zod de toutes les données qui franchissent une frontière :
 * lecture du localStorage, import d'un fichier, saisies de formulaire.
 * Bornes reprises de `DB_LIMITS` (alignées sur les CHECK SQL et docs/securite.md §4).
 */
import { z } from "zod";
import { DB_LIMITS } from "../db-types.ts";
import type { CapData } from "../domain/types.ts";

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

/** Texte libre : trim, longueur max, pas de caractères de contrôle. */
export const texte = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((s) => !CONTROL_CHARS.test(s), { message: "Caractères non autorisés." });

/** Texte obligatoire (1 à max caractères après trim). */
export const texteRequis = (max: number) => texte(max).refine((s) => s.length > 0, { message: "Champ requis." });

const id = z.string().min(1).max(100);
const isoDate = z.iso.date();
const isoDateTime = z.iso.datetime({ offset: true });
const valeur = z
  .number()
  .finite()
  .min(-DB_LIMITS.markerValueAbsMax)
  .max(DB_LIMITS.markerValueAbsMax)
  .transform((v) => Math.round(v * 100) / 100);

const long = texte(DB_LIMITS.longText);

export const smartSchema = z.strictObject({
  specific: long.optional(),
  measurable: long.optional(),
  achievable: long.optional(),
  relevant: long.optional(),
  deadline: isoDate.optional(),
});

export const contextSchema = z.strictObject({
  who: long.optional(),
  what: long.optional(),
  where: long.optional(),
  when: long.optional(),
  how: long.optional(),
  howMuch: long.optional(),
  why: long.optional(),
});

export const goalStatusSchema = z.enum(["active", "paused", "achieved", "abandoned"]);

export const goalSchema = z.strictObject({
  id,
  title: texteRequis(DB_LIMITS.title),
  icon: texte(32).optional(),
  smart: smartSchema,
  context: contextSchema.optional(),
  profil: z.string().regex(/^[a-z]{1,30}$/).optional(),
  status: goalStatusSchema,
  createdAt: isoDateTime,
  achievedAt: isoDateTime.optional(),
});

export const weekSchema = z.strictObject({
  id,
  goalId: id,
  weekStart: isoDate,
  focus: texte(DB_LIMITS.weekFocus).optional(),
});

const days = z.array(z.number().int().min(1).max(7)).max(7);

export const actionSchema = z.strictObject({
  id,
  goalId: id,
  weekId: id,
  label: texteRequis(DB_LIMITS.title),
  targetCount: z.number().int().min(1).max(21),
  days: days.optional(),
  createdAt: isoDateTime,
});

export const actionLogSchema = z.strictObject({
  id,
  actionId: id,
  date: isoDate,
  note: texte(DB_LIMITS.actionNote).optional(),
  createdAt: isoDateTime,
});

export const markerDirectionSchema = z.enum(["up", "down"]);
export const markerAggregationSchema = z.enum(["sum", "avg", "last"]);

export const markerSchema = z.strictObject({
  id,
  goalId: id,
  name: texteRequis(DB_LIMITS.title),
  unit: texte(DB_LIMITS.unit),
  baseline: valeur,
  target: valeur,
  direction: markerDirectionSchema,
  aggregation: markerAggregationSchema,
  createdAt: isoDateTime,
});

export const measurementSchema = z.strictObject({
  id,
  markerId: id,
  date: isoDate,
  value: valeur,
  createdAt: isoDateTime,
});

export const verdictSchema = z.enum(["progress", "stuck"]);

export const reviewSchema = z.strictObject({
  id,
  goalId: id,
  weekId: id,
  weekStart: isoDate,
  whatWorked: long,
  whatBlocked: long,
  whatIChange: long,
  verdict: verdictSchema,
  createdAt: isoDateTime,
});

export const causeFamilySchema = z.enum(["moi", "temps", "environnement", "moyens", "methode"]);

export const causeSchema = z.strictObject({
  family: causeFamilySchema,
  label: texteRequis(DB_LIMITS.title),
  weight: z.number().int().min(DB_LIMITS.causeWeightMin).max(DB_LIMITS.causeWeightMax),
});

export const analysisSchema = z.strictObject({
  id,
  goalId: id,
  reviewId: id.optional(),
  problem: texteRequis(DB_LIMITS.longText),
  whys: z.array(texteRequis(DB_LIMITS.longText)).max(DB_LIMITS.whysMax),
  causes: z.array(causeSchema).max(50),
  decision: long.optional(),
  createdAt: isoDateTime,
});

export const lessonSchema = z.strictObject({
  id,
  goalId: id,
  text: texteRequis(DB_LIMITS.longText),
  createdAt: isoDateTime,
});

export const recipeSchema = z
  .strictObject({
    id,
    goalId: id.optional(),
    title: texteRequis(DB_LIMITS.title),
    steps: z.array(texteRequis(DB_LIMITS.recipeSteps)).max(DB_LIMITS.recipeMaxSteps),
    when: long.optional(),
    createdAt: isoDateTime,
  })
  .refine((r) => r.steps.join("").length <= DB_LIMITS.recipeSteps, { message: "Recette trop longue." });

export const capDataSchema = z.strictObject({
  goals: z.array(goalSchema),
  weeks: z.array(weekSchema),
  actions: z.array(actionSchema),
  actionLogs: z.array(actionLogSchema),
  markers: z.array(markerSchema),
  measurements: z.array(measurementSchema),
  reviews: z.array(reviewSchema),
  rootCauseAnalyses: z.array(analysisSchema),
  lessons: z.array(lessonSchema),
  recipes: z.array(recipeSchema),
});

// Vérification à la compilation : le schéma produit bien un CapData.
const _assertCapData = (d: z.output<typeof capDataSchema>): CapData => d;
void _assertCapData;

/* ------------------------------------------------------------------ */
/* Entrées de formulaires (sans id ni dates, gérés par le repository)  */
/* ------------------------------------------------------------------ */

export const goalInputSchema = goalSchema.omit({ id: true, createdAt: true });
export type GoalInput = z.output<typeof goalInputSchema>;

export const actionDraftSchema = z.strictObject({
  id: id.optional(),
  label: texteRequis(DB_LIMITS.title),
  targetCount: z.number().int().min(1).max(21),
  days: days.optional(),
});
export type ActionDraft = z.output<typeof actionDraftSchema>;

export const markerDraftSchema = z.strictObject({
  id: id.optional(),
  name: texteRequis(DB_LIMITS.title),
  unit: texte(DB_LIMITS.unit),
  baseline: valeur,
  target: valeur,
  direction: markerDirectionSchema,
  aggregation: markerAggregationSchema,
});
export type MarkerDraft = z.output<typeof markerDraftSchema>;

export const measurementInputSchema = z.strictObject({ markerId: id, date: isoDate, value: valeur });
export type MeasurementInput = z.output<typeof measurementInputSchema>;

export const reviewInputSchema = reviewSchema.omit({ id: true, weekId: true, createdAt: true });
export type ReviewInput = z.output<typeof reviewInputSchema>;

export const analysisInputSchema = analysisSchema.omit({ id: true, createdAt: true });
export type AnalysisInput = z.output<typeof analysisInputSchema>;

export const recipeInputSchema = z.strictObject({
  goalId: id.optional(),
  title: texteRequis(DB_LIMITS.title),
  steps: z.array(texteRequis(DB_LIMITS.title)).max(DB_LIMITS.recipeMaxSteps),
  when: long.optional(),
});
export type RecipeInput = z.output<typeof recipeInputSchema>;

/** Import d'un fichier : 2 Mo au plus (docs/securite.md §4). */
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
