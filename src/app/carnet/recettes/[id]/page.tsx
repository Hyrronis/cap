"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { AppHeader } from "@/components/ui/layout";
import { ConfirmDialog } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useStore } from "@/lib/store";

export default function RecettePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, status, run } = useStore();
  const recipe = data.recipes.find((r) => r.id === id);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (recipe) document.title = `${recipe.title} · Cap`;
  }, [recipe]);

  if (status === "loading") return <Skeleton className="mt-16" />;
  if (!recipe) {
    return (
      <div className="pt-10">
        <ErrorState title="Cette recette n'existe plus." />
        <LinkButton href="/carnet?vue=recettes" variant="secondary" fullWidth>
          Voir mon carnet
        </LinkButton>
      </div>
    );
  }

  const remove = async () => {
    try {
      await run((r) => r.deleteRecipe(recipe.id));
      toast("Recette supprimée.");
      router.push("/carnet?vue=recettes");
    } catch {
      toast("Ce n'est pas enregistré. Vérifie ta connexion et réessaie.", { tone: "attention" });
    }
  };

  return (
    <div className="space-y-5">
      <AppHeader back="/carnet?vue=recettes" title={recipe.title} subtitle={recipe.when} />
      <section className="card space-y-2" aria-labelledby="steps-title">
        <h2 id="steps-title" className="text-heading">
          Ce que je garde
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-body">
          {recipe.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </section>
      <LinkButton href={`/objectifs/nouveau?recette=${recipe.id}`} variant="primary" fullWidth>
        Utiliser cette recette
      </LinkButton>
      <Button variant="ghost" fullWidth className="text-danger" onClick={() => setDeleting(true)}>
        Supprimer
      </Button>
      <ConfirmDialog
        open={deleting}
        tone="danger"
        title="Supprimer cette recette ?"
        description="Elle disparaîtra de ton carnet."
        confirmLabel="Supprimer"
        cancelLabel="Garder"
        onCancel={() => setDeleting(false)}
        onConfirm={remove}
      />
    </div>
  );
}
