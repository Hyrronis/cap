"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { purgeCaches } from "@/components/service-worker-register";
import { Button } from "@/components/ui/button";
import { SegmentedControl, TextField } from "@/components/ui/form";
import { AppHeader } from "@/components/ui/layout";
import { BottomSheet, ConfirmDialog } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { chargerExemples } from "@/lib/demo";
import { JOURS, capitalize } from "@/lib/format";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { LocalRepository, resetRepository } from "@/lib/repo";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { deleteAccount } from "./actions";

const VERSION = "0.1.0";

function Group({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id ?? title}-t`} id={id} className="space-y-2">
      <h2 id={`${id ?? title}-t`} className="text-heading">
        {title}
      </h2>
      <div className="card divide-y divide-border p-0">{children}</div>
    </section>
  );
}

const rowClass = "flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left text-body";

export default function ReglagesPage() {
  const router = useRouter();
  const toast = useToast();
  const prefs = usePrefs();
  const { repo, run } = useStore();
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [pending, startTransition] = useTransition();
  const account = repo.kind === "supabase";

  useEffect(() => {
    document.title = "Réglages · Cap";
    if (!account) return;
    createClient()
      ?.auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null))
      .catch(() => {});
  }, [account]);

  const exportData = async () => {
    try {
      const payload = await repo.exportData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cap-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Ton fichier est prêt.", { tone: "success" });
    } catch {
      toast("On n'a pas pu préparer ton fichier. Réessaie.", { tone: "attention" });
    }
  };

  /** Efface les données locales (clés cap:*) et les caches du service worker. */
  const wipeLocal = async () => {
    await new LocalRepository().clear();
    await purgeCaches();
    resetRepository();
  };

  const deleteAll = () =>
    startTransition(async () => {
      try {
        if (account) {
          const res = await deleteAccount({ confirmation: "SUPPRIMER" });
          if (!res.ok) throw new Error("échec");
        } else {
          await repo.clear();
        }
        await wipeLocal();
        setConfirmDelete(false);
        // Rechargement complet : plus aucune donnée en mémoire. Le message s'affiche à l'arrivée.
        window.location.replace("/bienvenue?supprime=1");
      } catch {
        toast("La suppression n'a pas abouti. Réessaie dans un instant.", { tone: "attention" });
      }
    });

  const logout = async () => {
    await createClient()?.auth.signOut();
    await wipeLocal();
    setPrefs({ onboarded: true });
    window.location.replace("/connexion");
  };

  const loadDemo = async () => {
    setConfirmDemo(false);
    try {
      await run((r) => chargerExemples(r));
      toast("Exemples chargés. Fais comme chez toi.", { tone: "success" });
      router.push("/");
    } catch {
      toast("On n'a pas pu charger les exemples. Réessaie.", { tone: "attention" });
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <AppHeader back="/" title="Réglages" />

      <Group title="Mon compte">
        <div className="px-4 py-3">
          <TextField
            label="Prénom"
            autoComplete="given-name"
            maxLength={80}
            value={name ?? prefs.firstName}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name == null) return;
              try {
                setPrefs({ firstName: name.trim() });
              } catch {
                toast("Ce prénom contient des caractères non autorisés.", { tone: "attention" });
              }
            }}
            hint="Utilisé seulement pour te saluer."
          />
        </div>
        {account ? (
          <div className={rowClass}>
            <span>E-mail</span>
            <span className="truncate text-ink-muted">{email ?? "…"}</span>
          </div>
        ) : (
          isSupabaseConfigured() && (
            <Link href="/connexion" className={rowClass}>
              Créer un compte pour sauvegarder
              <ChevronRight size={20} className="text-ink-muted" aria-hidden="true" />
            </Link>
          )
        )}
      </Group>

      <Group title="Mon rythme">
        <div className={rowClass}>
          <label htmlFor="review-day">Jour de mon bilan</label>
          <select
            id="review-day"
            value={prefs.reviewDay}
            onChange={(e) => setPrefs({ reviewDay: Number(e.target.value) })}
            className="h-11 rounded-md border border-border-strong bg-surface px-3 text-body"
          >
            {JOURS.map((j, i) => (
              <option key={j} value={i + 1}>
                {capitalize(j)}
              </option>
            ))}
          </select>
        </div>
        <div className={rowClass}>
          <span>Début de semaine</span>
          <span className="text-ink-muted">Lundi</span>
        </div>
      </Group>

      <section aria-labelledby="theme-t" className="space-y-2">
        <h2 id="theme-t" className="text-heading">
          Affichage
        </h2>
        <SegmentedControl
          label="Thème"
          options={[
            { value: "light", label: "Clair" },
            { value: "dark", label: "Sombre" },
            { value: "system", label: "Comme mon téléphone" },
          ]}
          value={prefs.theme}
          onChange={(v) => setPrefs({ theme: v })}
        />
      </section>

      <Group title="Mes données" id="mes-donnees">
        {!account && (
          <p className="px-4 py-3 text-small text-ink-muted">
            Tes données restent sur cet appareil, dans ce navigateur. Toute personne qui l&apos;utilise peut les voir.
          </p>
        )}
        <button type="button" className={rowClass} onClick={exportData}>
          Exporter mes données
          <ChevronRight size={20} className="text-ink-muted" aria-hidden="true" />
        </button>
        <button type="button" className={rowClass} onClick={() => setConfirmDemo(true)}>
          Essayer avec des exemples
          <ChevronRight size={20} className="text-ink-muted" aria-hidden="true" />
        </button>
        <button type="button" className={`${rowClass} font-semibold text-danger`} onClick={() => setConfirmDelete(true)}>
          {account ? "Supprimer mon compte et mes données" : "Effacer toutes mes données locales"}
        </button>
      </Group>

      <Group title="À propos">
        <Link href="/bienvenue" className={rowClass}>
          Revoir la présentation
          <ChevronRight size={20} className="text-ink-muted" aria-hidden="true" />
        </Link>
        <Link href="/confidentialite" className={rowClass}>
          Politique de confidentialité
          <ChevronRight size={20} className="text-ink-muted" aria-hidden="true" />
        </Link>
        <div className={rowClass}>
          <span>Version</span>
          <span className="text-ink-muted tabular-nums">{VERSION}</span>
        </div>
      </Group>

      {account && (
        <Button variant="secondary" fullWidth onClick={() => setConfirmLogout(true)}>
          Me déconnecter
        </Button>
      )}

      <ConfirmDialog
        open={confirmDelete}
        tone="danger"
        title="Tout supprimer ?"
        description="Tes objectifs, plans, bilans et ton carnet seront effacés définitivement. Pense à exporter tes données avant."
        requireText="SUPPRIMER"
        requireLabel="Écris SUPPRIMER pour confirmer"
        confirmLabel="Tout supprimer"
        loading={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteAll}
      />
      <BottomSheet open={confirmLogout} title="Te déconnecter ?" onClose={() => setConfirmLogout(false)}>
        <Button fullWidth onClick={logout}>
          Me déconnecter
        </Button>
        <Button variant="secondary" fullWidth onClick={() => setConfirmLogout(false)}>
          Annuler
        </Button>
      </BottomSheet>
      <BottomSheet
        open={confirmDemo}
        title="Charger les exemples ?"
        description="Deux objectifs d'exemple remplaceront tes données actuelles. Exporte-les avant si besoin."
        onClose={() => setConfirmDemo(false)}
      >
        <Button fullWidth onClick={loadDemo}>
          Charger les exemples
        </Button>
        <Button variant="secondary" fullWidth onClick={() => setConfirmDemo(false)}>
          Annuler
        </Button>
      </BottomSheet>
    </div>
  );
}
