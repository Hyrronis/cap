import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

let browserClient: SupabaseClient | null = null;

/**
 * Client Supabase côté navigateur (singleton).
 * Retourne `null` si les variables d'environnement sont absentes : l'app reste en mode local.
 * Phase 2 : typer avec `SupabaseClient<Database>` depuis `@/lib/db-types`.
 */
export function createClient(): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) return null;
  browserClient ??= createBrowserClient(env.url, env.anonKey);
  return browserClient;
}
