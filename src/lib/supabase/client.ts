import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db-types";
import { getSupabaseEnv } from "./env";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Client Supabase côté navigateur (singleton, session en cookies via @supabase/ssr).
 * Retourne `null` si les variables d'environnement sont absentes : l'app reste en mode local.
 */
export function createClient(): SupabaseClient<Database> | null {
  const env = getSupabaseEnv();
  if (!env) return null;
  browserClient ??= createBrowserClient<Database>(env.url, env.anonKey);
  return browserClient;
}
