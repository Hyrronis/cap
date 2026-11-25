/**
 * Types des lignes Postgres (Supabase) — reflet exact de
 * `supabase/migrations/20261125000000_init.sql`. Noms en snake_case, comme la base.
 *
 * - `XxxRow`    : ce que renvoie un SELECT.
 * - `XxxInsert` : ce qu'on envoie à un INSERT (colonnes avec défaut facultatives ;
 *                 `user_id` est rempli par la base via auth.uid(), ne pas l'envoyer).
 * - `XxxUpdate` : patch partiel pour un UPDATE.
 * - `Database`  : forme compatible avec `createClient<Database>()` de supabase-js.
 *
 * Conventions : uuid, date (« yyyy-mm-dd ») et timestamptz (ISO 8601) sont des `string`.
 * Les colonnes `numeric` arrivent en `number` via PostgREST.
 *
 * À régénérer/vérifier avec `supabase gen types typescript --local` si le schéma évolue.
 */

export type Uuid = string;
/** Date civile « yyyy-mm-dd ». */
export type DbDate = string;
/** Horodatage ISO 8601 (timestamptz). */
export type DbTimestamp = string;

/* ------------------------------------------------------------------ */
/* Valeurs contraintes par CHECK                                       */
/* ------------------------------------------------------------------ */

export type GoalDomainDb = 'sante' | 'argent' | 'travail' | 'relations' | 'autre';
export type GoalStatusDb = 'actif' | 'atteint' | 'en_pause' | 'abandonne';
export type CycleStatusDb = 'en_cours' | 'termine';
export type MarkerDirectionDb = 'plus_haut' | 'plus_bas';
/** Regroupement des saisies d'une semaine : somme, moyenne, dernière valeur. */
export type MarkerAggregationDb = 'sum' | 'avg' | 'last';
export type VerdictDb = 'avance' | 'bloque';
export type CauseFamilyDb = 'moi' | 'temps' | 'environnement' | 'moyens' | 'methode';

/**
 * Bornes imposées par les CHECK SQL (alignées sur docs/securite.md §4).
 * Les schémas zod doivent utiliser les mêmes valeurs.
 */
export const DB_LIMITS = {
  /** Titres : objectif, action, repère, cause, recette (1 à 120 après trim). */
  title: 120,
  /** why, SMART, QQOQCCP, réponses de bilan, pourquoi, leçons, problème, décision. */
  longText: 1000,
  /** Recette : total des étapes (20 étapes au plus). */
  recipeSteps: 2000,
  recipeMaxSteps: 20,
  unit: 20,
  /** Valeurs de repère : -1e9 … 1e9, 2 décimales. */
  markerValueAbsMax: 1e9,
  markerValueDecimals: 2,
  whysMax: 5,
  causeWeightMin: 1,
  causeWeightMax: 5,
  displayName: 80,
  actionNote: 500,
  weekFocus: 500,
} as const;

export const GOAL_DOMAINS_DB: readonly GoalDomainDb[] = ['sante', 'argent', 'travail', 'relations', 'autre'];
export const GOAL_STATUSES_DB: readonly GoalStatusDb[] = ['actif', 'atteint', 'en_pause', 'abandonne'];
export const CAUSE_FAMILIES_DB: readonly CauseFamilyDb[] = ['moi', 'temps', 'environnement', 'moyens', 'methode'];

/**
 * Correspondances avec les codes du domaine (`src/lib/domain/types.ts`),
 * qui utilise des codes anglais pour certains champs. Seule la couche
 * repository Supabase devrait s'en servir.
 */
export const GOAL_STATUS_FROM_DOMAIN = {
  active: 'actif',
  achieved: 'atteint',
  paused: 'en_pause',
  abandoned: 'abandonne',
} as const satisfies Record<string, GoalStatusDb>;

export const GOAL_STATUS_TO_DOMAIN = {
  actif: 'active',
  atteint: 'achieved',
  en_pause: 'paused',
  abandonne: 'abandoned',
} as const satisfies Record<GoalStatusDb, string>;

export const MARKER_DIRECTION_FROM_DOMAIN = { up: 'plus_haut', down: 'plus_bas' } as const satisfies Record<
  string,
  MarkerDirectionDb
>;
export const MARKER_DIRECTION_TO_DOMAIN = { plus_haut: 'up', plus_bas: 'down' } as const satisfies Record<
  MarkerDirectionDb,
  string
>;

export const VERDICT_FROM_DOMAIN = { progress: 'avance', stuck: 'bloque' } as const satisfies Record<
  string,
  VerdictDb
>;
export const VERDICT_TO_DOMAIN = { avance: 'progress', bloque: 'stuck' } as const satisfies Record<
  VerdictDb,
  string
>;

/* ------------------------------------------------------------------ */
/* Lignes                                                              */
/* ------------------------------------------------------------------ */

export type ProfileRow = {
  id: Uuid; // = auth.users.id
  display_name: string | null;
  timezone: string;
  locale: string;
  onboarded_at: DbTimestamp | null;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type GoalRow = {
  id: Uuid;
  user_id: Uuid;
  title: string;
  icon: string | null;
  why: string | null;
  domain: GoalDomainDb;
  status: GoalStatusDb;
  smart_specific: string | null;
  smart_measurable: string | null;
  smart_achievable: string | null;
  smart_relevant: string | null;
  smart_time_bound: string | null;
  qq_what: string | null;
  qq_who: string | null;
  qq_where: string | null;
  qq_when: string | null;
  qq_how: string | null;
  qq_how_much: string | null;
  start_date: DbDate;
  target_date: DbDate | null;
  achieved_on: DbDate | null;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type CycleRow = {
  id: Uuid;
  user_id: Uuid;
  goal_id: Uuid;
  /** Toujours un lundi (CHECK isodow = 1). */
  week_start: DbDate;
  status: CycleStatusDb;
  focus: string | null;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type PlannedActionRow = {
  id: Uuid;
  user_id: Uuid;
  cycle_id: Uuid;
  label: string;
  /** 1 à 21. */
  target_count: number;
  /** Jours suggérés, 1 = lundi … 7 = dimanche. */
  days: number[] | null;
  position: number;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type ActionLogRow = {
  id: Uuid;
  user_id: Uuid;
  action_id: Uuid;
  /** Unique par (action_id, done_on). */
  done_on: DbDate;
  note: string | null;
  created_at: DbTimestamp;
};

export type MarkerRow = {
  id: Uuid;
  user_id: Uuid;
  goal_id: Uuid;
  name: string;
  unit: string | null;
  baseline: number | null;
  target: number | null;
  direction: MarkerDirectionDb;
  /** Défaut 'sum'. */
  aggregation: MarkerAggregationDb;
  archived_at: DbTimestamp | null;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type MarkerMeasurementRow = {
  id: Uuid;
  user_id: Uuid;
  marker_id: Uuid;
  value: number;
  measured_on: DbDate;
  created_at: DbTimestamp;
};

export type WeeklyReviewRow = {
  id: Uuid;
  user_id: Uuid;
  /** Unique : un bilan par cycle. */
  cycle_id: Uuid;
  what_worked: string | null;
  what_blocked: string | null;
  what_i_change: string | null;
  verdict: VerdictDb;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type BlockerAnalysisRow = {
  id: Uuid;
  user_id: Uuid;
  goal_id: Uuid;
  review_id: Uuid | null;
  problem: string;
  root_cause: string | null;
  decision: string | null;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type BlockerWhyRow = {
  id: Uuid;
  user_id: Uuid;
  analysis_id: Uuid;
  /** 1 à 5, unique par analyse. */
  position: number;
  answer: string;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type BlockerCauseRow = {
  id: Uuid;
  user_id: Uuid;
  analysis_id: Uuid;
  family: CauseFamilyDb;
  label: string;
  /** 1 (léger) à 5 (pèse lourd). */
  weight: number;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type LessonRow = {
  id: Uuid;
  user_id: Uuid;
  goal_id: Uuid | null;
  content: string;
  position: number;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

export type RecipeRow = {
  id: Uuid;
  user_id: Uuid;
  goal_id: Uuid | null;
  title: string;
  trigger_cue: string | null;
  steps: string[];
  frequency: string | null;
  domain: GoalDomainDb | null;
  created_at: DbTimestamp;
  updated_at: DbTimestamp;
};

/* ------------------------------------------------------------------ */
/* Insert / Update                                                     */
/* ------------------------------------------------------------------ */

/** Colonnes gérées par la base : jamais envoyées par l'app. */
type ServerManaged = 'user_id' | 'created_at' | 'updated_at';

/**
 * Insert = colonnes obligatoires sans défaut + le reste en facultatif.
 * `Required` liste les colonnes NOT NULL sans valeur par défaut.
 */
type InsertOf<Row, Required extends keyof Row> = Pick<Row, Required> &
  Partial<Omit<Row, Required | ServerManaged>> & { user_id?: Uuid };

type UpdateOf<Row> = Partial<Omit<Row, 'id' | ServerManaged>>;

export type ProfileInsert = Pick<ProfileRow, 'id'> & Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>;
export type ProfileUpdate = Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>;

export type GoalInsert = InsertOf<GoalRow, 'title'>;
export type GoalUpdate = UpdateOf<GoalRow>;

export type CycleInsert = InsertOf<CycleRow, 'goal_id' | 'week_start'>;
export type CycleUpdate = UpdateOf<CycleRow>;

export type PlannedActionInsert = InsertOf<PlannedActionRow, 'cycle_id' | 'label'>;
export type PlannedActionUpdate = UpdateOf<PlannedActionRow>;

export type ActionLogInsert = InsertOf<ActionLogRow, 'action_id'>;
export type ActionLogUpdate = UpdateOf<ActionLogRow>;

export type MarkerInsert = InsertOf<MarkerRow, 'goal_id' | 'name'>;
export type MarkerUpdate = UpdateOf<MarkerRow>;

export type MarkerMeasurementInsert = InsertOf<MarkerMeasurementRow, 'marker_id' | 'value'>;
export type MarkerMeasurementUpdate = UpdateOf<MarkerMeasurementRow>;

export type WeeklyReviewInsert = InsertOf<WeeklyReviewRow, 'cycle_id' | 'verdict'>;
export type WeeklyReviewUpdate = UpdateOf<WeeklyReviewRow>;

export type BlockerAnalysisInsert = InsertOf<BlockerAnalysisRow, 'goal_id' | 'problem'>;
export type BlockerAnalysisUpdate = UpdateOf<BlockerAnalysisRow>;

export type BlockerWhyInsert = InsertOf<BlockerWhyRow, 'analysis_id' | 'position' | 'answer'>;
export type BlockerWhyUpdate = UpdateOf<BlockerWhyRow>;

export type BlockerCauseInsert = InsertOf<BlockerCauseRow, 'analysis_id' | 'family' | 'label'>;
export type BlockerCauseUpdate = UpdateOf<BlockerCauseRow>;

export type LessonInsert = InsertOf<LessonRow, 'content'>;
export type LessonUpdate = UpdateOf<LessonRow>;

export type RecipeInsert = InsertOf<RecipeRow, 'title'>;
export type RecipeUpdate = UpdateOf<RecipeRow>;

/* ------------------------------------------------------------------ */
/* Database (format supabase-js)                                       */
/* ------------------------------------------------------------------ */

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert, Update, Relationships extends Rel[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type MyDataExport = {
  exported_at: DbTimestamp;
  profile: ProfileRow | null;
  goals: GoalRow[];
  cycles: CycleRow[];
  planned_actions: PlannedActionRow[];
  action_logs: ActionLogRow[];
  markers: MarkerRow[];
  marker_measurements: MarkerMeasurementRow[];
  weekly_reviews: WeeklyReviewRow[];
  blocker_analyses: BlockerAnalysisRow[];
  blocker_whys: BlockerWhyRow[];
  blocker_causes: BlockerCauseRow[];
  lessons: LessonRow[];
  recipes: RecipeRow[];
};

/**
 * Pas de RPC de suppression de compte : elle passe par une Server Action
 * (`auth.admin.deleteUser`, clé secrète, module server-only) — la cascade SQL
 * depuis auth.users efface tout. Voir docs/base-de-donnees.md.
 */
export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, ProfileInsert, ProfileUpdate>;
      goals: Table<GoalRow, GoalInsert, GoalUpdate>;
      cycles: Table<
        CycleRow,
        CycleInsert,
        CycleUpdate,
        [
          {
            foreignKeyName: 'cycles_goal_fk';
            columns: ['goal_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id', 'user_id'];
          },
        ]
      >;
      planned_actions: Table<
        PlannedActionRow,
        PlannedActionInsert,
        PlannedActionUpdate,
        [
          {
            foreignKeyName: 'planned_actions_cycle_fk';
            columns: ['cycle_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'cycles';
            referencedColumns: ['id', 'user_id'];
          },
        ]
      >;
      action_logs: Table<
        ActionLogRow,
        ActionLogInsert,
        ActionLogUpdate,
        [
          {
            foreignKeyName: 'action_logs_action_fk';
            columns: ['action_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'planned_actions';
            referencedColumns: ['id', 'user_id'];
          },
        ]
      >;
      markers: Table<
        MarkerRow,
        MarkerInsert,
        MarkerUpdate,
        [
          {
            foreignKeyName: 'markers_goal_fk';
            columns: ['goal_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id', 'user_id'];
          },
        ]
      >;
      marker_measurements: Table<
        MarkerMeasurementRow,
        MarkerMeasurementInsert,
        MarkerMeasurementUpdate,
        [
          {
            foreignKeyName: 'marker_measurements_marker_fk';
            columns: ['marker_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'markers';
            referencedColumns: ['id', 'user_id'];
          },
        ]
      >;
      weekly_reviews: Table<
        WeeklyReviewRow,
        WeeklyReviewInsert,
        WeeklyReviewUpdate,
        [
          {
            foreignKeyName: 'weekly_reviews_cycle_fk';
            columns: ['cycle_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'cycles';
            referencedColumns: ['id', 'user_id'];
          },
        ]
      >;
      blocker_analyses: Table<
        BlockerAnalysisRow,
        BlockerAnalysisInsert,
        BlockerAnalysisUpdate,
        [
          {
            foreignKeyName: 'blocker_analyses_goal_fk';
            columns: ['goal_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'blocker_analyses_review_fk';
            columns: ['review_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'weekly_reviews';
            referencedColumns: ['id', 'user_id'];
          },
        ]
      >;
      blocker_whys: Table<
        BlockerWhyRow,
        BlockerWhyInsert,
        BlockerWhyUpdate,
        [
          {
            foreignKeyName: 'blocker_whys_analysis_fk';
            columns: ['analysis_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'blocker_analyses';
            referencedColumns: ['id', 'user_id'];
          },
        ]
      >;
      blocker_causes: Table<
        BlockerCauseRow,
        BlockerCauseInsert,
        BlockerCauseUpdate,
        [
          {
            foreignKeyName: 'blocker_causes_analysis_fk';
            columns: ['analysis_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'blocker_analyses';
            referencedColumns: ['id', 'user_id'];
          },
        ]
      >;
      lessons: Table<
        LessonRow,
        LessonInsert,
        LessonUpdate,
        [
          {
            foreignKeyName: 'lessons_goal_fk';
            columns: ['goal_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id', 'user_id'];
          },
        ]
      >;
      recipes: Table<
        RecipeRow,
        RecipeInsert,
        RecipeUpdate,
        [
          {
            foreignKeyName: 'recipes_goal_fk';
            columns: ['goal_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id', 'user_id'];
          },
        ]
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      export_my_data: { Args: Record<string, never>; Returns: MyDataExport };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

/** Raccourcis : `Tables<'goals'>`, `TablesInsert<'goals'>`, `TablesUpdate<'goals'>`. */
type PublicTables = Database['public']['Tables'];
export type TableName = keyof PublicTables;
export type Tables<T extends TableName> = PublicTables[T]['Row'];
export type TablesInsert<T extends TableName> = PublicTables[T]['Insert'];
export type TablesUpdate<T extends TableName> = PublicTables[T]['Update'];
