"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const deleteSchema = z.strictObject({ confirmation: z.literal("SUPPRIMER") });

/**
 * Suppression immédiate du compte : getUser() (jeton revalidé), puis
 * auth.admin.deleteUser avec la clé secrète. La cascade SQL depuis auth.users
 * efface toutes les tables. Messages génériques uniquement.
 */
export async function deleteAccount(input: unknown): Promise<{ ok: boolean }> {
  if (!deleteSchema.safeParse(input).success) return { ok: false };
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return { ok: false };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false };
  const res = await admin.auth.admin.deleteUser(data.user.id);
  if (res.error) {
    console.error("Suppression de compte : échec", res.error.status ?? "");
    return { ok: false };
  }
  await supabase.auth.signOut();
  return { ok: true };
}
