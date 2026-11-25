/**
 * Types du domaine « Cap » (camelCase, indépendants de la base de données).
 * La correspondance avec les lignes Postgres (snake_case) se fait dans la
 * couche repository, à partir de `src/lib/db-types.ts` (expert base de données).
 *
 * Conventions :
 * - `Id` : identifiant opaque (uuid côté Supabase, chaîne aléatoire en localStorage).
 * - `IsoDate` : date civile « yyyy-mm-dd » en fuseau local de l'utilisateur.
 * - `IsoDateTime` : horodatage ISO 8601 complet (ex. new Date().toISOString()).
 */

export type Id = string;
export type IsoDate = string;
export type IsoDateTime = string;

/** Statut d'un objectif. */
export type GoalStatus = 'active' | 'paused' | 'achieved' | 'abandoned';

/** Critères SMART, chacun renseigné ou non par l'assistant de création. */
export interface SmartCriteria {
  /** Spécifique : qu'est-ce que je veux exactement ? */
  specific?: string;
  /** Mesurable : comment je saurai que j'y suis ? (souvent lié à un repère) */
  measurable?: string;
  /** Atteignable : pourquoi c'est réaliste pour moi ? */
  achievable?: string;
  /** Pertinent : pourquoi c'est important pour moi ? */
  relevant?: string;
  /** Temporel : pour quand ? */
  deadline?: IsoDate;
}

/** Questions QQOQCCP guidées (toutes facultatives). */
export interface GoalContext {
  who?: string; // Qui ?
  what?: string; // Quoi ?
  where?: string; // Où ?
  when?: string; // Quand ?
  how?: string; // Comment ?
  howMuch?: string; // Combien ?
  why?: string; // Pourquoi ?
}

export interface Goal {
  id: Id;
  title: string;
  /** Emoji ou mot-clé d'icône choisi par l'utilisateur. */
  icon?: string;
  smart: SmartCriteria;
  context?: GoalContext;
  status: GoalStatus;
  createdAt: IsoDateTime;
  achievedAt?: IsoDateTime;
}

/** Une semaine de la boucle hebdomadaire pour un objectif. */
export interface Week {
  id: Id;
  goalId: Id;
  /** Lundi de la semaine (yyyy-mm-dd, fuseau local). */
  weekStart: IsoDate;
  /** Intention de la semaine (facultative). */
  focus?: string;
}
/** Alias : « cycle » = une semaine de la boucle. */
export type Cycle = Week;

/** Action prévue pour une semaine (1 à 3 recommandées). */
export interface PlannedAction {
  id: Id;
  goalId: Id;
  weekId: Id;
  label: string;
  /** Nombre de fois prévu dans la semaine (ex. 3 sorties). Défaut 1. */
  targetCount: number;
  /** Jours suggérés (1 = lundi … 7 = dimanche), facultatif. */
  days?: number[];
  createdAt: IsoDateTime;
}

/** Une fois où l'action a été faite (« cocher » en 1 tap). */
export interface ActionLog {
  id: Id;
  actionId: Id;
  /** Jour de réalisation (yyyy-mm-dd local). */
  date: IsoDate;
  note?: string;
  createdAt: IsoDateTime;
}

export type MarkerDirection = 'up' | 'down';

/**
 * Comment regrouper les mesures d'une semaine :
 * - 'sum'  : total de la semaine (dépenses notées au fil de l'eau, km courus…) ;
 *            la cible est alors une cible hebdomadaire.
 * - 'avg'  : moyenne de la semaine (allure, poids, humeur, heures de sommeil…).
 * - 'last' : dernière valeur notée (solde d'un livret, record, niveau atteint…).
 */
export type MarkerAggregation = 'sum' | 'avg' | 'last';

/** Repère chiffré (jamais appelé « indicateur » dans l'interface). */
export interface Marker {
  id: Id;
  goalId: Id;
  name: string;
  /** Unité affichée : « km », « € », « min »… */
  unit: string;
  /** Valeur de départ (sert de base pour la progression). */
  baseline: number;
  /** Valeur visée. */
  target: number;
  /** 'up' : plus c'est haut, mieux c'est ; 'down' : l'inverse. */
  direction: MarkerDirection;
  /** Regroupement hebdomadaire des mesures (graphique, progression, tendance). */
  aggregation: MarkerAggregation;
  createdAt: IsoDateTime;
}

/** Une valeur notée pour un repère. */
export interface Measurement {
  id: Id;
  markerId: Id;
  date: IsoDate;
  value: number;
  createdAt: IsoDateTime;
}

export type WeeklyVerdict = 'progress' | 'stuck';

/** Bilan de la semaine : 3 questions + verdict. */
export interface WeeklyReview {
  id: Id;
  goalId: Id;
  weekId: Id;
  /** Lundi de la semaine concernée (dénormalisé pour les calculs). */
  weekStart: IsoDate;
  whatWorked: string;
  whatBlocked: string;
  whatIChange: string;
  verdict: WeeklyVerdict;
  createdAt: IsoDateTime;
}

/** Les 5 familles du « tour des causes ». */
export type CauseFamily = 'moi' | 'temps' | 'environnement' | 'moyens' | 'methode';

export const CAUSE_FAMILIES: readonly CauseFamily[] = [
  'moi',
  'temps',
  'environnement',
  'moyens',
  'methode',
] as const;

/** Libellés d'interface (tutoiement, sans jargon). */
export const CAUSE_FAMILY_LABELS: Readonly<Record<CauseFamily, string>> = {
  moi: 'Moi',
  temps: 'Mon temps',
  environnement: 'Mon environnement',
  moyens: 'Mes moyens',
  methode: 'Ma méthode',
};

export interface Cause {
  family: CauseFamily;
  label: string;
  /** Poids ressenti (ex. 1 à 5) : « combien ça pèse ». */
  weight: number;
}

/** « Creuser la cause » : 5 pourquoi + tour des causes. */
export interface RootCauseAnalysis {
  id: Id;
  goalId: Id;
  /** Bilan (bloqué) à l'origine de l'analyse, si applicable. */
  reviewId?: Id;
  problem: string;
  /** Réponses successives aux « pourquoi ? » (jusqu'à 5). */
  whys: string[];
  causes: Cause[];
  /** Ce que je décide de changer en conséquence. */
  decision?: string;
  createdAt: IsoDateTime;
}

/** « Ce que j'en retiens » (3 leçons par objectif atteint, en principe). */
export interface Lesson {
  id: Id;
  goalId: Id;
  text: string;
  createdAt: IsoDateTime;
}

/** « Ma recette qui marche » : routine réutilisable. */
export interface Recipe {
  id: Id;
  /** Objectif d'origine (facultatif : une recette peut être réutilisée ailleurs). */
  goalId?: Id;
  title: string;
  /** Étapes de la routine, dans l'ordre. */
  steps: string[];
  /** Quand l'utiliser (déclencheur, contexte). */
  when?: string;
  createdAt: IsoDateTime;
}

/** Ensemble des données d'un utilisateur (export, démo, stockage local). */
export interface CapData {
  goals: Goal[];
  weeks: Week[];
  actions: PlannedAction[];
  actionLogs: ActionLog[];
  markers: Marker[];
  measurements: Measurement[];
  reviews: WeeklyReview[];
  rootCauseAnalyses: RootCauseAnalysis[];
  lessons: Lesson[];
  recipes: Recipe[];
}
