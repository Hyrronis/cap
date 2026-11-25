import { createClient } from "@/lib/supabase/client";
import { LocalRepository } from "./local.ts";
import { SupabaseRepository } from "./supabase.ts";
import type { Repository } from "./types.ts";

export type * from "./types.ts";
export { NotFoundError } from "./types.ts";
export { LocalRepository } from "./local.ts";
export { SupabaseRepository } from "./supabase.ts";

let instance: Repository | null = null;

/**
 * Point d'entrée unique de l'accès aux données (côté client).
 * - Supabase si NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies ;
 * - sinon localStorage (mode prototype, sans backend).
 */
export function getRepository(): Repository {
  if (instance) return instance;
  const client = createClient();
  instance = client ? new SupabaseRepository(client) : new LocalRepository();
  return instance;
}

/** Réservé aux tests. */
export function resetRepositoryForTests(): void {
  instance = null;
}
