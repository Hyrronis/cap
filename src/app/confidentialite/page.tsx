import Link from "next/link";

export const metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <article className="space-y-4 py-6">
      <h1 className="text-title">Politique de confidentialité</h1>
      <p className="text-small text-ink-muted">Version de travail du prototype : le responsable de traitement et le contact restent à nommer avant la mise en ligne publique.</p>
      <h2 className="text-heading">Ce qu&apos;on collecte</h2>
      <p>Ton e-mail (si tu crées un compte) et ce que tu écris dans l&apos;app. Rien d&apos;autre : pas de géolocalisation, pas de contacts, pas de traceur publicitaire.</p>
      <h2 className="text-heading">Où c&apos;est stocké</h2>
      <p>Sans compte : uniquement sur cet appareil, dans ce navigateur. Avec un compte : en Europe, visible par toi seul·e.</p>
      <h2 className="text-heading">Tes droits</h2>
      <p>Tu peux tout exporter ou tout effacer à tout moment depuis les réglages. Tu peux aussi saisir la CNIL.</p>
      <Link href="/connexion" className="inline-flex min-h-11 items-center font-semibold text-primary">
        Retour
      </Link>
    </article>
  );
}
