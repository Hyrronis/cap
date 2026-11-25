/**
 * Types PROVISOIRES de la couche d'accès aux données (phase 1).
 * En phase 2, ils seront remplacés/alignés sur les types du data ingénieur
 * (`@/lib/domain/`) et de la base (`@/lib/db-types`).
 */

export type Id = string;

/** Champs communs à toute entité persistée. Dates au format ISO 8601. */
export interface Entity {
  id: Id;
  createdAt: string;
  updatedAt: string;
}

export type StatutObjectif = "actif" | "en_pause" | "atteint" | "abandonne";

export interface Objectif extends Entity {
  titre: string;
  description: string | null;
  statut: StatutObjectif;
}

/** Données fournies à la création (le repository gère id et dates). */
export type ObjectifInput = Omit<Objectif, keyof Entity>;

/** CRUD générique minimal, asynchrone pour être identique en local et en distant. */
export interface Collection<T extends Entity, TInput> {
  list(): Promise<T[]>;
  get(id: Id): Promise<T | null>;
  create(input: TInput): Promise<T>;
  update(id: Id, patch: Partial<TInput>): Promise<T>;
  remove(id: Id): Promise<void>;
}

export interface Repository {
  readonly kind: "local" | "supabase";
  readonly objectifs: Collection<Objectif, ObjectifInput>;
  // Phase 2 : plans, actions, repères, bilans, causes, leçons, recettes…
}

export class NotFoundError extends Error {
  constructor(entity: string, id: Id) {
    super(`${entity} introuvable : ${id}`);
    this.name = "NotFoundError";
  }
}
