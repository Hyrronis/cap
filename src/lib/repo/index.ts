import { readPrefs } from "@/lib/prefs";
import { createClient } from "@/lib/supabase/client";
import { LocalRepository } from "./local.ts";
import { SupabaseRepository } from "./supabase.ts";
import type { Repository } from "./types.ts";

export type * from "./types.ts";
export { NotFoundError, InvalidInputError, emptyCapData } from "./types.ts";
export { LocalRepository } from "./local.ts";
export { SupabaseRepository } from "./supabase.ts";

let instance: Repository | null = null;

/**
 * Point d'entrée unique de l'accès aux données (côté client).
 * - Supabase si NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies
 *   et que la personne n'a pas choisi « Continuer sans compte » ;
 * - sinon localStorage (mode prototype, sans backend).
 */
export function getRepository(): Repository {
  if (instance) return instance;
  const client = readPrefs().localMode ? null : createClient();
  instance = client ? new SupabaseRepository(client) : new LocalRepository();
  return instance;
}

/** À appeler quand le mode change (connexion, « continuer sans compte »). */
export function resetRepository(): void {
  instance = null;
}
