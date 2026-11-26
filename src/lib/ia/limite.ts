/**
 * Limite de débit en mémoire, par clé (IP), fenêtre glissante.
 * Best-effort : chaque instance serverless a sa propre mémoire.
 */
export function creerLimiteur(max: number, fenetreMs: number, maxCles = 5_000) {
  const hits = new Map<string, number[]>();
  return {
    /** true si la requête est acceptée (et la compte). */
    accepter(cle: string, maintenant = Date.now()): boolean {
      const depuis = maintenant - fenetreMs;
      const liste = (hits.get(cle) ?? []).filter((t) => t > depuis);
      if (liste.length >= max) {
        hits.set(cle, liste);
        return false;
      }
      liste.push(maintenant);
      hits.delete(cle);
      hits.set(cle, liste);
      // Mémoire bornée : on oublie les clés les plus anciennes.
      while (hits.size > maxCles) hits.delete(hits.keys().next().value as string);
      return true;
    },
  };
}
