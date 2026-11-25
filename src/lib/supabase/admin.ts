import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db-types";
import { getSupabaseEnv } from "./env";

/**
 * Client d'administration (clé secrète). Usage unique : suppression de compte
 * (docs/securite.md §8). Ne jamais importer depuis un composant client :
 * `server-only` fait échouer le build si c'est le cas.
 */
export function createAdminClient() {
  const env = getSupabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!env || !secret) return null;
  return createClient<Database>(env.url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
