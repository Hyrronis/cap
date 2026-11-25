import { z } from "zod";
import {
  NotFoundError,
  type Collection,
  type Entity,
  type Id,
  type Objectif,
  type ObjectifInput,
  type Repository,
} from "./types.ts";

/** Sous-ensemble de l'API Storage utilisé (permet l'injection en test). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const STORAGE_KEY = "cap:data";
export const SCHEMA_VERSION = 1;

const objectifSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  titre: z.string(),
  description: z.string().nullable(),
  statut: z.enum(["actif", "en_pause", "atteint", "abandonne"]),
});

const dataSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  objectifs: z.array(objectifSchema),
});

type LocalData = z.infer<typeof dataSchema>;

/**
 * Migrations : `migrations[n]` transforme des données en version n vers n+1.
 * Ajouter une entrée à chaque incrément de SCHEMA_VERSION.
 */
const migrations: Record<number, (data: unknown) => unknown> = {};

const emptyData = (): LocalData => ({ version: SCHEMA_VERSION, objectifs: [] });

function migrate(raw: unknown): unknown {
  let data = raw;
  let version = (data as { version?: unknown } | null)?.version;
  while (typeof version === "number" && version < SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) break;
    data = step(data);
    version = (data as { version?: unknown }).version;
  }
  return data;
}

/** Stockage en mémoire : repli si localStorage est indisponible (SSR, navigation privée…). */
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
    // localStorage bloqué : on bascule en mémoire.
  }
  return memoryStorage();
}

function newId(): Id {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type Clock = () => Date;

export class LocalRepository implements Repository {
  readonly kind = "local" as const;
  readonly objectifs: Collection<Objectif, ObjectifInput>;

  private readonly storage: StorageLike;
  private readonly now: Clock;

  constructor(options: { storage?: StorageLike; now?: Clock } = {}) {
    this.storage = options.storage ?? defaultStorage();
    this.now = options.now ?? (() => new Date());
    this.objectifs = this.collection("objectifs", "Objectif");
  }

  /** Lit et valide les données ; en cas de corruption, sauvegarde le brut et repart à vide. */
  read(): LocalData {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      return emptyData();
    }
    if (raw === null) return emptyData();
    try {
      const parsed = dataSchema.safeParse(migrate(JSON.parse(raw)));
      if (parsed.success) return parsed.data;
    } catch {
      // JSON invalide : traité ci-dessous.
    }
    try {
      this.storage.setItem(`${STORAGE_KEY}:corrompu:${this.now().getTime()}`, raw);
    } catch {
      // Pas de place pour la sauvegarde : tant pis, on ne bloque pas l'utilisateur.
    }
    return emptyData();
  }

  private write(data: LocalData): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      throw new Error("Impossible d'enregistrer sur cet appareil (stockage plein ou bloqué).", { cause: err });
    }
  }

  /** Efface toutes les données locales (droit à l'effacement). */
  clear(): void {
    try {
      this.storage.removeItem(STORAGE_KEY);
    } catch {
      // ignoré
    }
  }

  private collection<K extends Exclude<keyof LocalData, "version">, T extends LocalData[K][number] & Entity>(
    key: K,
    label: string,
  ): Collection<T, Omit<T, keyof Entity>> {
    type Input = Omit<T, keyof Entity>;
    const items = (data: LocalData) => data[key] as unknown as T[];

    return {
      list: async () => items(this.read()).map((x) => ({ ...x })),
      get: async (id) => {
        const found = items(this.read()).find((x) => x.id === id);
        return found ? { ...found } : null;
      },
      create: async (input: Input) => {
        const data = this.read();
        const stamp = this.now().toISOString();
        const entity = { ...input, id: newId(), createdAt: stamp, updatedAt: stamp } as T;
        items(data).push(entity);
        this.write(data);
        return { ...entity };
      },
      update: async (id, patch: Partial<Input>) => {
        const data = this.read();
        const list = items(data);
        const index = list.findIndex((x) => x.id === id);
        const current = list[index];
        if (!current) throw new NotFoundError(label, id);
        const updated = { ...current, ...patch, id, createdAt: current.createdAt, updatedAt: this.now().toISOString() } as T;
        list[index] = updated;
        this.write(data);
        return { ...updated };
      },
      remove: async (id) => {
        const data = this.read();
        const list = items(data);
        const index = list.findIndex((x) => x.id === id);
        if (index === -1) return;
        list.splice(index, 1);
        this.write(data);
      },
    };
  }
}
