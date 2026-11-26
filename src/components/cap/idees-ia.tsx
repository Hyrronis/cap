"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { IaEntree, IaSortie } from "@/lib/ia/schema";
import { setPrefs, usePrefs } from "@/lib/prefs";

type Etat = "repos" | "consentement" | "chargement" | "ok" | "erreur" | "indisponible";

/** Appelle la route serveur (same-origin). Ne lève jamais : renvoie null en cas d'échec. */
async function demander(entree: IaEntree): Promise<{ suggestions: IaSortie } | { indisponible: true } | null> {
  try {
    const dispo = await fetch("/api/ia/suggestions", { cache: "no-store" });
    if (!dispo.ok || !((await dispo.json()) as { disponible?: boolean }).disponible) return { indisponible: true };
    const res = await fetch("/api/ia/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entree),
      cache: "no-store",
    });
    if (res.status === 503) return { indisponible: true };
    if (!res.ok) return null;
    const body = (await res.json()) as { suggestions?: IaSortie };
    return body.suggestions ? { suggestions: body.suggestions } : null;
  } catch {
    return null;
  }
}

/**
 * Bouton « Demander des idées à l'IA » : jamais appelé automatiquement,
 * consentement demandé à la première utilisation (mémorisé sur l'appareil).
 * Les idées reçues sont passées au parent, qui les affiche en puces.
 * En cas d'échec, le parent garde ses idées habituelles (profils).
 */
export function IdeesIa({ entree, onIdees }: { entree: () => IaEntree; onIdees: (s: IaSortie) => void }) {
  const prefs = usePrefs();
  const [etat, setEtat] = useState<Etat>("repos");

  if (!prefs.ready || prefs.ia === "non") return null;

  const lancer = async () => {
    setEtat("chargement");
    const r = await demander(entree());
    if (r && "suggestions" in r) {
      onIdees(r.suggestions);
      setEtat("ok");
    } else setEtat(r ? "indisponible" : "erreur");
  };

  if (etat === "consentement") {
    return (
      <section aria-label="Idées de l'IA" className="space-y-3 rounded-lg bg-primary-soft p-4">
        <p className="text-small">
          Pour te proposer des idées, le texte de ton objectif (et, selon l&apos;écran, les réponses que tu viens d&apos;écrire) est envoyé à l&apos;IA Claude
          d&apos;Anthropic, une société américaine : il quitte donc l&apos;Union européenne. Ni ton e-mail ni ton identifiant ne sont envoyés, et Cap
          n&apos;enregistre pas ta demande.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              setPrefs({ ia: "oui" });
              void lancer();
            }}
          >
            Accepter
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setPrefs({ ia: "non" });
              setEtat("repos");
            }}
          >
            Non merci
          </Button>
        </div>
        <p className="text-caption text-ink-muted">Tu pourras changer d&apos;avis dans Réglages.</p>
      </section>
    );
  }

  return (
    <div className="space-y-1">
      <Button
        variant="secondary"
        size="sm"
        loading={etat === "chargement"}
        loadingLabel="Je réfléchis…"
        iconLeft={<Sparkles size={18} aria-hidden="true" />}
        onClick={() => (prefs.ia === "oui" ? void lancer() : setEtat("consentement"))}
      >
        {etat === "ok" ? "D'autres idées de l'IA" : "Demander des idées à l'IA"}
      </Button>
      <p role="status" className="text-caption text-ink-muted">
        {etat === "ok" && "Les idées de l'IA sont ajoutées en premier."}
        {etat === "erreur" && "L'IA n'a pas pu répondre cette fois. Voici nos idées habituelles."}
        {etat === "indisponible" && "Les idées de l'IA ne sont pas disponibles ici. Voici nos idées habituelles."}
      </p>
    </div>
  );
}
