/** Configuration Supabase publique. Les deux variables doivent être présentes et non vides. */
export type SupabaseEnv = { url: string; anonKey: string };

export function getSupabaseEnv(): SupabaseEnv | null {
  // Références littérales obligatoires : Next.js les remplace au build côté client.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}
