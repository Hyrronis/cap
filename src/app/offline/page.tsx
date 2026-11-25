import { WifiOff } from "lucide-react";

export const metadata = { title: "Hors ligne" };

/** Page de repli du service worker : statique, sans aucune donnée personnelle. */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
      <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary">
        <WifiOff size={40} aria-hidden="true" />
      </span>
      <h1 className="text-title">Tu es hors ligne</h1>
      <p className="text-body text-ink-muted">Cette page n&apos;est pas disponible sans réseau. Réessaie dès que la connexion revient.</p>
      <a href="/" className="inline-flex h-12 items-center rounded-md bg-primary px-5 font-semibold text-primary-on">
        Réessayer
      </a>
    </div>
  );
}
