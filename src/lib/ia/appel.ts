/**
 * Appel à Claude pour les idées de l'IA, avec un client injectable (testable
 * sans réseau). Le module serveur `claude.ts` fournit le vrai client.
 */
import Anthropic from "@anthropic-ai/sdk";
import { IA_JSON_SCHEMA, IA_SYSTEM, construireMessage, lireSortie, type IaEntree, type IaSortie } from "./schema.ts";

export const IA_MODEL = "claude-opus-5-5";

/** Raisons d'échec, sans détail technique ni contenu utilisateur (rien de sensible dans les journaux). */
export type IaEchec = "refus" | "trop_long" | "format" | "limite" | "indisponible" | "erreur";
export type IaResultat = { ok: true; suggestions: IaSortie } | { ok: false; raison: IaEchec };

/** Sous-ensemble du client utilisé ici (pour les tests). */
export type ClientMessages = Pick<Anthropic, "messages">;

export async function demanderIdees(client: ClientMessages, entree: IaEntree): Promise<IaResultat> {
  try {
    const message = await client.messages.create({
      model: IA_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: { type: "json_schema", schema: IA_JSON_SCHEMA as unknown as Record<string, unknown> } },
      system: IA_SYSTEM,
      messages: [{ role: "user", content: construireMessage(entree) }],
    });
    if (message.stop_reason === "refusal") return { ok: false, raison: "refus" };
    if (message.stop_reason === "max_tokens") return { ok: false, raison: "trop_long" };
    const texte = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    const suggestions = lireSortie(texte);
    return suggestions ? { ok: true, suggestions } : { ok: false, raison: "format" };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return { ok: false, raison: "limite" };
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return { ok: false, raison: "indisponible" };
    if (error instanceof Anthropic.APIConnectionError) return { ok: false, raison: "indisponible" };
    if (error instanceof Anthropic.APIError) return { ok: false, raison: "erreur" };
    return { ok: false, raison: "erreur" };
  }
}
