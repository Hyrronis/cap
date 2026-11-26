import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { demanderIdees, type IaResultat } from "./appel";
import type { IaEntree } from "./schema";

let client: Anthropic | null = null;

/** Vrai si une clé est configurée côté serveur (jamais exposée au client). */
export function iaDisponible(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

function getClient(): Anthropic {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!.trim(), timeout: 20_000, maxRetries: 1 });
  return client;
}

export function suggestionsIa(entree: IaEntree): Promise<IaResultat> {
  return demanderIdees(getClient(), entree);
}
