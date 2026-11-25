"use client";

import { creerDonneesDemo } from "@/lib/domain/donnees-demo";
import type { Repository } from "@/lib/repo";

/** Charge le jeu d'exemples (remplace les données actuelles). */
export async function chargerExemples(repo: Repository): Promise<void> {
  await repo.replaceAll(creerDonneesDemo(new Date()));
}
