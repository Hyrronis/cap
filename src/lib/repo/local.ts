import type { z } from "zod";
import type { CapData, Id, IsoDate, Week } from "../domain/types.ts";
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
} from "./schemas.ts";
import { DB_LIMITS } from "../db-types.ts";
import { emptyCapData, InvalidInputError, NotFoundError, type Repository } from "./types.ts";

/** Sous-ensemble de l'API Storage utilisé (permet l'injection en test). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length?: number;
  key?(index: number): string | null;
}

/** Une seule clé, préfixée et versionnée (docs/securite.md §6). */
export const STORAGE_KEY = "cap:v1:data";
export const SCHEMA_VERSION = 1;
/** Clé de la phase 1 (prototype), purgée à la première lecture. */
const LEGACY_KEYS = ["cap:data"];

interface LocalDocument {
  version: typeof SCHEMA_VERSION;
  data: CapData;
}

/**
 * Migrations : `migrations[n]` transforme un document en version n vers n+1.
 * Ajouter une entrée à chaque incrément de SCHEMA_VERSION.
 */
const migrations: Record<number, (doc: unknown) => unknown> = {};

function migrate(raw: unknown): unknown {
  let doc = raw;
  let version = (doc as { version?: unknown } | null)?.version;
  while (typeof version === "number" && version < SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) break;
    doc = step(doc);
    version = (doc as { version?: unknown }).version;
  }
  return doc;
}

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function defaultStorage(): StorageLike {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const probe = "cap:probe";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return window.localStorage;
    }
  } catch {
    // localStorage bloqué : repli en mémoire.
  }
  return memoryStorage();
}

export function newId(): Id {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const r = schema.safeParse(value);
  if (!r.success) throw new InvalidInputError();
  return r.data;
}

type Clock = () => Date;

/** État de la dernière lecture : utile pour proposer export brut + réinitialisation. */
export type ReadStatus = "ok" | "empty" | "corrupted" | "unavailable";

export class LocalRepository implements Repository {
  readonly kind = "local" as const;
  private readonly storage: StorageLike;
  private readonly now: Clock;
  lastReadStatus: ReadStatus = "empty";

  constructor(options: { storage?: StorageLike; now?: Clock } = {}) {
    this.storage = options.storage ?? defaultStorage();
    this.now = options.now ?? (() => new Date());
  }

  /** Lit et valide les données ; si elles sont corrompues, garde le brut à part et repart à vide. */
  read(): CapData {
    let raw: string | null = null;
    try {
      for (const k of LEGACY_KEYS) this.storage.removeItem(k);
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      this.lastReadStatus = "unavailable";
      return emptyCapData();
    }
    if (raw === null) {
      this.lastReadStatus = "empty";
      return emptyCapData();
    }
    try {
      const doc = migrate(JSON.parse(raw)) as { version?: unknown; data?: unknown };
      if (doc?.version === SCHEMA_VERSION) {
        const parsed = capDataSchema.safeParse(doc.data);
        if (parsed.success) {
          this.lastReadStatus = "ok";
          return parsed.data;
        }
      }
    } catch {
      // JSON invalide : traité ci-dessous.
    }
    this.lastReadStatus = "corrupted";
    try {
      this.storage.setItem(`${STORAGE_KEY}:corrompu:${this.now().getTime()}`, raw);
    } catch {
      // Pas de place : on ne bloque pas l'utilisateur.
    }
    return emptyCapData();
  }

  private write(data: CapData): void {
    const doc: LocalDocument = { version: SCHEMA_VERSION, data };
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(doc));
    } catch (err) {
      throw new Error("Impossible d'enregistrer sur cet appareil (stockage plein ou bloqué).", { cause: err });
    }
  }

  private stamp(): string {
    return this.now().toISOString();
  }

  /** Lecture → modification → écriture, en une transaction locale. */
  private tx<T>(fn: (data: CapData) => T): T {
    const data = this.read();
    const result = fn(data);
    this.write(data);
    return result;
  }

  async load(): Promise<CapData> {
    return this.read();
  }

  async createGoal(input: Parameters<Repository["createGoal"]>[0]) {
    const clean = parse(goalInputSchema, input);
    return this.tx((d) => {
      const goal = { ...clean, id: newId(), createdAt: this.stamp() };
      d.goals.push(goal);
      return { ...goal };
    });
  }

  async updateGoal(id: Id, patch: Parameters<Repository["updateGoal"]>[1]) {
    const clean = parse(goalInputSchema.partial(), patch);
    return this.tx((d) => {
      const i = d.goals.findIndex((g) => g.id === id);
      if (i === -1) throw new NotFoundError("Objectif", id);
      const updated = { ...d.goals[i], ...clean, id };
      if (updated.status !== "achieved") delete updated.achievedAt;
      d.goals[i] = updated;
      return { ...updated };
    });
  }

  async deleteGoal(id: Id) {
    this.tx((d) => {
      const weekIds = new Set(d.weeks.filter((w) => w.goalId === id).map((w) => w.id));
      const actionIds = new Set(d.actions.filter((a) => a.goalId === id || weekIds.has(a.weekId)).map((a) => a.id));
      const markerIds = new Set(d.markers.filter((m) => m.goalId === id).map((m) => m.id));
      d.goals = d.goals.filter((g) => g.id !== id);
      d.weeks = d.weeks.filter((w) => !weekIds.has(w.id));
      d.actions = d.actions.filter((a) => !actionIds.has(a.id));
      d.actionLogs = d.actionLogs.filter((l) => !actionIds.has(l.actionId));
      d.markers = d.markers.filter((m) => !markerIds.has(m.id));
      d.measurements = d.measurements.filter((m) => !markerIds.has(m.markerId));
      d.reviews = d.reviews.filter((r) => r.goalId !== id);
      d.rootCauseAnalyses = d.rootCauseAnalyses.filter((a) => a.goalId !== id);
      // Leçons et recettes survivent à leur objectif (comme en base).
    });
  }

  private ensureWeekIn(d: CapData, goalId: Id, weekStart: IsoDate): Week {
    if (!d.goals.some((g) => g.id === goalId)) throw new NotFoundError("Objectif", goalId);
    let week = d.weeks.find((w) => w.goalId === goalId && w.weekStart === weekStart);
    if (!week) {
      week = { id: newId(), goalId, weekStart };
      d.weeks.push(week);
    }
    return week;
  }

  async ensureWeek(goalId: Id, weekStart: IsoDate) {
    return this.tx((d) => ({ ...this.ensureWeekIn(d, goalId, weekStart) }));
  }

  async saveWeekPlan(goalId: Id, weekStart: IsoDate, actions: Parameters<Repository["saveWeekPlan"]>[2]) {
    const clean = actions.map((a) => parse(actionDraftSchema, a));
    return this.tx((d) => {
      const week = this.ensureWeekIn(d, goalId, weekStart);
      const keep = new Set(clean.map((a) => a.id).filter(Boolean));
      const removed = new Set(d.actions.filter((a) => a.weekId === week.id && !keep.has(a.id)).map((a) => a.id));
      d.actions = d.actions.filter((a) => !removed.has(a.id));
      d.actionLogs = d.actionLogs.filter((l) => !removed.has(l.actionId));
      const stamp = this.stamp();
      return clean.map((draft) => {
        const existing = draft.id ? d.actions.find((a) => a.id === draft.id && a.weekId === week.id) : undefined;
        if (existing) {
          existing.label = draft.label;
          existing.targetCount = draft.targetCount;
          existing.days = draft.days?.length ? draft.days : undefined;
          if (!existing.days) delete existing.days;
          return { ...existing };
        }
        const created = {
          id: newId(),
          goalId,
          weekId: week.id,
          label: draft.label,
          targetCount: draft.targetCount,
          ...(draft.days?.length ? { days: draft.days } : {}),
          createdAt: stamp,
        };
        d.actions.push(created);
        return { ...created };
      });
    });
  }

  async saveMarkers(goalId: Id, markers: Parameters<Repository["saveMarkers"]>[1]) {
    const clean = markers.map((m) => parse(markerDraftSchema, m));
    return this.tx((d) => {
      if (!d.goals.some((g) => g.id === goalId)) throw new NotFoundError("Objectif", goalId);
      const keep = new Set(clean.map((m) => m.id).filter(Boolean));
      const removed = new Set(d.markers.filter((m) => m.goalId === goalId && !keep.has(m.id)).map((m) => m.id));
      d.markers = d.markers.filter((m) => !removed.has(m.id));
      d.measurements = d.measurements.filter((m) => !removed.has(m.markerId));
      const stamp = this.stamp();
      return clean.map((draft) => {
        const { id: draftId, ...fields } = draft;
        const existing = draftId ? d.markers.find((m) => m.id === draftId && m.goalId === goalId) : undefined;
        if (existing) {
          Object.assign(existing, fields);
          return { ...existing };
        }
        const created = { ...fields, id: newId(), goalId, createdAt: stamp };
        d.markers.push(created);
        return { ...created };
      });
    });
  }

  async addActionLog(actionId: Id, date: IsoDate) {
    const input = parse(measurementInputSchema.pick({ date: true }), { date });
    return this.tx((d) => {
      if (!d.actions.some((a) => a.id === actionId)) throw new NotFoundError("Action", actionId);
      const existing = d.actionLogs.find((l) => l.actionId === actionId && l.date === input.date);
      if (existing) return { ...existing };
      const log = { id: newId(), actionId, date: input.date, createdAt: this.stamp() };
      d.actionLogs.push(log);
      return { ...log };
    });
  }

  async removeActionLog(id: Id) {
    this.tx((d) => {
      d.actionLogs = d.actionLogs.filter((l) => l.id !== id);
    });
  }

  async addMeasurement(input: Parameters<Repository["addMeasurement"]>[0]) {
    const clean = parse(measurementInputSchema, input);
    return this.tx((d) => {
      if (!d.markers.some((m) => m.id === clean.markerId)) throw new NotFoundError("Repère", clean.markerId);
      const m = { ...clean, id: newId(), createdAt: this.stamp() };
      d.measurements.push(m);
      return { ...m };
    });
  }

  async saveReview(input: Parameters<Repository["saveReview"]>[0]) {
    const clean = parse(reviewInputSchema, input);
    return this.tx((d) => {
      const week = this.ensureWeekIn(d, clean.goalId, clean.weekStart);
      const i = d.reviews.findIndex((r) => r.weekId === week.id);
      const review = {
        ...clean,
        id: i === -1 ? newId() : d.reviews[i].id,
        weekId: week.id,
        createdAt: this.stamp(),
      };
      if (i === -1) d.reviews.push(review);
      else d.reviews[i] = review;
      return { ...review };
    });
  }

  async createAnalysis(input: Parameters<Repository["createAnalysis"]>[0]) {
    const clean = parse(analysisInputSchema, input);
    return this.tx((d) => {
      if (!d.goals.some((g) => g.id === clean.goalId)) throw new NotFoundError("Objectif", clean.goalId);
      const a = { ...clean, id: newId(), createdAt: this.stamp() };
      d.rootCauseAnalyses.push(a);
      return structuredClone(a);
    });
  }

  async createLessons(goalId: Id, texts: string[]) {
    const clean = texts.map((t) => parse(texteRequis(DB_LIMITS.longText), t));
    return this.tx((d) => {
      const stamp = this.stamp();
      const created = clean.map((text) => ({ id: newId(), goalId, text, createdAt: stamp }));
      d.lessons.push(...created);
      return created.map((l) => ({ ...l }));
    });
  }

  async createRecipe(input: Parameters<Repository["createRecipe"]>[0]) {
    const clean = parse(recipeInputSchema, input);
    return this.tx((d) => {
      const r = { ...clean, id: newId(), createdAt: this.stamp() };
      if (!r.goalId) delete r.goalId;
      if (!r.when) delete r.when;
      d.recipes.push(r);
      return structuredClone(r);
    });
  }

  async deleteRecipe(id: Id) {
    this.tx((d) => {
      d.recipes = d.recipes.filter((r) => r.id !== id);
    });
  }

  async replaceAll(data: CapData) {
    this.write(parse(capDataSchema, data));
  }

  async exportData() {
    return { application: "Cap", format: SCHEMA_VERSION, exportedAt: this.stamp(), data: this.read() };
  }

  /** Efface toutes les clés `cap:*` de ce stockage (droit à l'effacement). */
  async clear() {
    try {
      const keys: string[] = [];
      if (typeof this.storage.length === "number" && this.storage.key) {
        for (let i = 0; i < this.storage.length; i++) {
          const k = this.storage.key(i);
          if (k?.startsWith("cap:")) keys.push(k);
        }
      }
      for (const k of new Set([...keys, STORAGE_KEY, ...LEGACY_KEYS])) this.storage.removeItem(k);
    } catch {
      // ignoré
    }
  }
}
