import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db-types";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/**
 * Client Supabase côté serveur (Server Components, Route Handlers, Server Actions).
 * Un client par requête (jamais partagé). Retourne `null` si l'env est absente.
 */
export async function createClient(): Promise<SupabaseClient<Database> | null> {
  const env = getSupabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Appelé depuis un Server Component : écriture impossible, ignorée.
          // Le rafraîchissement de session se fera dans le proxy/middleware (phase 2).
        }
      },
    },
  });
}
