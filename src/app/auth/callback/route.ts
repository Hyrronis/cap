import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.object({
  code: z.string().min(1).max(512).optional(),
  token_hash: z.string().min(1).max(512).optional(),
  type: z.enum(["magiclink", "email", "signup", "recovery", "invite", "email_change"]).optional(),
  next: z.string().max(512).optional(),
});

/** Retour du lien magique : échange côté serveur, redirection interne uniquement. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const parsed = paramsSchema.safeParse(Object.fromEntries(url.searchParams));
  const fail = () => {
    const r = NextResponse.redirect(new URL("/connexion?erreur=lien", url.origin));
    r.headers.set("Cache-Control", "private, no-store");
    return r;
  };
  if (!parsed.success) return fail();
  const supabase = await createClient();
  if (!supabase) return fail();

  const { code, token_hash, type, next } = parsed.data;
  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (token_hash && type) ok = !(await supabase.auth.verifyOtp({ token_hash, type: type as EmailOtpType })).error;
  if (!ok) return fail();

  const r = NextResponse.redirect(new URL(safeNextPath(next), url.origin));
  r.headers.set("Cache-Control", "private, no-store");
  return r;
}
