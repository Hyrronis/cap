import { NextResponse, type NextRequest } from "next/server";
import { iaDisponible, suggestionsIa } from "@/lib/ia/claude";
import { creerLimiteur } from "@/lib/ia/limite";
import { IA_MAX_BODY, iaEntreeSchema } from "@/lib/ia/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 10 requêtes / 10 min par IP (best-effort, mémoire de l'instance). */
const limiteur = creerLimiteur(10, 10 * 60_000);

const json = (body: unknown, status: number, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** Requête same-origin uniquement : l'en-tête Origin doit correspondre à l'hôte servi. */
function memeOrigine(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

function ipDe(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "inconnue";
}

/** Disponibilité seulement (aucun appel à l'IA) : permet à l'interface d'éviter un POST voué au 503. */
export function GET() {
  return json({ disponible: iaDisponible() }, 200);
}

export async function POST(req: NextRequest) {
  if (!memeOrigine(req)) return json({ erreur: "origine" }, 403);
  if (!iaDisponible()) return json({ disponible: false }, 503);
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return json({ disponible: true, erreur: "entree" }, 415);
  }

  const taille = Number(req.headers.get("content-length") ?? "0");
  if (taille > IA_MAX_BODY) return json({ disponible: true, erreur: "trop_gros" }, 413);
  if (!limiteur.accepter(ipDe(req))) return json({ disponible: true, erreur: "limite" }, 429, { "Retry-After": "600" });

  let corps: unknown;
  try {
    const texte = await req.text();
    if (texte.length > IA_MAX_BODY) return json({ disponible: true, erreur: "trop_gros" }, 413);
    corps = JSON.parse(texte);
  } catch {
    return json({ disponible: true, erreur: "entree" }, 400);
  }
  const entree = iaEntreeSchema.safeParse(corps);
  if (!entree.success) return json({ disponible: true, erreur: "entree" }, 400);

  const resultat = await suggestionsIa(entree.data);
  if (!resultat.ok) return json({ disponible: true, erreur: resultat.raison }, resultat.raison === "limite" ? 429 : 502);
  return json({ disponible: true, suggestions: resultat.suggestions }, 200);
}
