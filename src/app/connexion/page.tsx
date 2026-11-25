"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/form";
import { BottomSheet } from "@/components/ui/sheet";
import { resetRepository } from "@/lib/repo";
import { setPrefs } from "@/lib/prefs";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const emailSchema = z.email().max(254);

export default function ConnexionPage() {
  const params = useSearchParams();
  const supabase = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(params.get("erreur") === "lien" ? "Ce lien a expiré. Demande-en un nouveau." : null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  useEffect(() => {
    document.title = "Connexion · Cap";
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const startLocal = () => {
    setPrefs({ localMode: true, onboarded: true });
    resetRepository();
    window.location.assign("/");
  };

  const send = async (target = email) => {
    const parsed = emailSchema.safeParse(target.trim());
    if (!parsed.success) {
      setError("Cet e-mail ne semble pas complet. Vérifie-le.");
      return;
    }
    const client = createClient();
    if (!client) return;
    setSending(true);
    setError(null);
    const { error: err } = await client.auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
    setSending(false);
    if (err) {
      setError("On n'a pas pu envoyer le lien. Réessaie dans un instant.");
      return;
    }
    setPrefs({ localMode: false, onboarded: true });
    setSentTo(parsed.data);
    setCooldown(60);
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center gap-8 py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-display text-primary">Cap</h1>
        <p className="text-body text-ink-muted">Avance vers ce qui compte, une semaine à la fois.</p>
      </div>

      {supabase && (
        <div className="space-y-4">
          {sentTo ? (
            <div role="status" className="card space-y-3">
              <p className="text-body">
                Regarde ta boîte mail. On a envoyé un lien à <strong>{sentTo}</strong>. Il est valable 1 heure.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" disabled={cooldown > 0} onClick={() => send(sentTo)}>
                  {cooldown > 0 ? `Renvoyer dans ${cooldown} s` : "Renvoyer le lien"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSentTo(null)}>
                  Changer d&apos;e-mail
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <TextField
                label="Ton e-mail"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={error}
                hint="Pas de mot de passe : on t'envoie un lien par e-mail."
              />
              <Button type="submit" fullWidth loading={sending} loadingLabel="Envoi…">
                Recevoir mon lien de connexion
              </Button>
            </form>
          )}
          <div className="flex items-center gap-3 text-small text-ink-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Button variant={supabase ? "secondary" : "primary"} fullWidth onClick={startLocal}>
          {supabase ? "Continuer sans compte" : "Commencer"}
        </Button>
        <p className="text-center text-small text-ink-muted">Tes données restent sur ce téléphone. Tu pourras créer un compte plus tard.</p>
      </div>

      <div className="space-y-2 text-center text-small text-ink-muted">
        <p>
          En continuant, tu acceptes les CGU et la{" "}
          <Link href="/confidentialite" className="font-semibold text-primary underline">
            politique de confidentialité
          </Link>
          .
        </p>
        <button type="button" className="min-h-11 font-semibold text-primary" onClick={() => setPrivacy(true)}>
          Comment on protège tes données
        </button>
      </div>
      <BottomSheet
        open={privacy}
        onClose={() => setPrivacy(false)}
        title="Comment on protège tes données"
        description="Tes objectifs sont privés. Ils sont stockés en Europe, visibles par toi seul·e, et tu peux tout exporter ou tout effacer à tout moment depuis les réglages."
      >
        <Button fullWidth onClick={() => setPrivacy(false)}>
          J&apos;ai compris
        </Button>
      </BottomSheet>
    </div>
  );
}
