import type { SupabaseClient } from "@supabase/supabase-js";
import {
  NotFoundError,
  type Collection,
  type Id,
  type Objectif,
  type ObjectifInput,
  type Repository,
} from "./types.ts";

/**
 * Implémentation Supabase (SQUELETTE, phase 1).
 * Phase 2 : typer le client avec `Database` (`@/lib/db-types`), aligner noms de tables
 * et colonnes sur les migrations de `supabase/`. L'isolation par utilisateur repose sur la RLS :
 * `user_id` est rempli par défaut côté base (auth.uid()), jamais par le client.
 */
const TABLE_OBJECTIFS = "objectifs"; // provisoire, à aligner sur le schéma

type ObjectifRow = {
  id: string;
  titre: string;
  description: string | null;
  statut: Objectif["statut"];
  created_at: string;
  updated_at: string;
};

const fromRow = (r: ObjectifRow): Objectif => ({
  id: r.id,
  titre: r.titre,
  description: r.description,
  statut: r.statut,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const COLUMNS = "id, titre, description, statut, created_at, updated_at";

export class SupabaseRepository implements Repository {
  readonly kind = "supabase" as const;
  readonly objectifs: Collection<Objectif, ObjectifInput>;

  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
    this.objectifs = {
      list: async () => {
        const { data, error } = await this.client
          .from(TABLE_OBJECTIFS)
          .select(COLUMNS)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data as ObjectifRow[]).map(fromRow);
      },
      get: async (id: Id) => {
        const { data, error } = await this.client.from(TABLE_OBJECTIFS).select(COLUMNS).eq("id", id).maybeSingle();
        if (error) throw error;
        return data ? fromRow(data as ObjectifRow) : null;
      },
      create: async (input) => {
        const { data, error } = await this.client.from(TABLE_OBJECTIFS).insert(input).select(COLUMNS).single();
        if (error) throw error;
        return fromRow(data as ObjectifRow);
      },
      update: async (id, patch) => {
        const { data, error } = await this.client
          .from(TABLE_OBJECTIFS)
          .update(patch)
          .eq("id", id)
          .select(COLUMNS)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new NotFoundError("Objectif", id);
        return fromRow(data as ObjectifRow);
      },
      remove: async (id) => {
        const { error } = await this.client.from(TABLE_OBJECTIFS).delete().eq("id", id);
        if (error) throw error;
      },
    };
  }
}
