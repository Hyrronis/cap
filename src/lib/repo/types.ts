/**
 * Couche d'accès aux données, alignée sur les types du domaine (`CapData`).
 * Deux implémentations : LocalRepository (localStorage) et SupabaseRepository.
 * Toutes les entrées sont validées par zod (schemas.ts) avant écriture.
 */
import type {
  ActionLog,
  CapData,
  Goal,
  Id,
  IsoDate,
  Lesson,
  Marker,
  Measurement,
  PlannedAction,
  Recipe,
  RootCauseAnalysis,
  Week,
  WeeklyReview,
} from "../domain/types.ts";
import type {
  ActionDraft,
  AnalysisInput,
  GoalInput,
  MarkerDraft,
  MeasurementInput,
  RecipeInput,
  ReviewInput,
} from "./schemas.ts";

export type { ActionDraft, AnalysisInput, GoalInput, MarkerDraft, MeasurementInput, RecipeInput, ReviewInput };

export interface Repository {
  readonly kind: "local" | "supabase";

  /** Toutes les données de l'utilisateur (validées). */
  load(): Promise<CapData>;

  createGoal(input: GoalInput): Promise<Goal>;
  updateGoal(id: Id, patch: Partial<GoalInput>): Promise<Goal>;
  /** Supprime l'objectif et tout ce qui en dépend (les leçons et recettes restent). */
  deleteGoal(id: Id): Promise<void>;

  /** Crée la semaine si besoin. */
  ensureWeek(goalId: Id, weekStart: IsoDate): Promise<Week>;
  /**
   * Remplace le plan d'une semaine : met à jour les actions qui ont un id,
   * crée les autres, supprime celles qui ne sont plus listées (et leurs coches).
   */
  saveWeekPlan(goalId: Id, weekStart: IsoDate, actions: ActionDraft[]): Promise<PlannedAction[]>;

  /** Remplace les repères d'un objectif (même principe ; un repère retiré garde ses mesures côté Supabase). */
  saveMarkers(goalId: Id, markers: MarkerDraft[]): Promise<Marker[]>;

  /** Une coche par action et par jour au plus. */
  addActionLog(actionId: Id, date: IsoDate): Promise<ActionLog>;
  removeActionLog(id: Id): Promise<void>;

  addMeasurement(input: MeasurementInput): Promise<Measurement>;

  /** Un bilan par objectif et par semaine : crée ou remplace. */
  saveReview(input: ReviewInput): Promise<WeeklyReview>;

  createAnalysis(input: AnalysisInput): Promise<RootCauseAnalysis>;

  createLessons(goalId: Id, texts: string[]): Promise<Lesson[]>;
  createRecipe(input: RecipeInput): Promise<Recipe>;
  deleteRecipe(id: Id): Promise<void>;

  /** Remplace toutes les données (exemples, import). */
  replaceAll(data: CapData): Promise<void>;
  /** Export complet (RGPD, portabilité). */
  exportData(): Promise<unknown>;
  /** Efface toutes les données de ce stockage. */
  clear(): Promise<void>;
}

export class NotFoundError extends Error {
  constructor(entity: string, id: Id) {
    super(`${entity} introuvable : ${id}`);
    this.name = "NotFoundError";
  }
}

/** Erreur de validation d'une saisie (message générique pour l'utilisateur). */
export class InvalidInputError extends Error {
  constructor(message = "Saisie invalide.") {
    super(message);
    this.name = "InvalidInputError";
  }
}

export const emptyCapData = (): CapData => ({
  goals: [],
  weeks: [],
  actions: [],
  actionLogs: [],
  markers: [],
  measurements: [],
  reviews: [],
  rootCauseAnalyses: [],
  lessons: [],
  recipes: [],
});
