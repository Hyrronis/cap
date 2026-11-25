export default function AccueilPage() {
  return (
    <main className="flex flex-1 flex-col justify-center gap-6 py-10">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white">
        C
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Bienvenue sur Cap</h1>
      <p className="text-lg leading-relaxed text-encre/80">
        Choisis ce qui compte pour toi, avance un petit pas à la fois, et ajuste chaque semaine.
        Pas de pression : on construit ça ensemble.
      </p>
      <p className="rounded-xl bg-white p-4 text-sm text-encre/70 shadow-sm">
        L&apos;app est en cours de construction. Tes objectifs arrivent bientôt ici.
      </p>
    </main>
  );
}
