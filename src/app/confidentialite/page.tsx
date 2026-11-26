import Link from "next/link";

export const metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <article className="space-y-4 py-6">
      <h1 className="text-title">Politique de confidentialité</h1>
      <p className="text-small text-ink-muted">Version de travail du prototype : le responsable de traitement et le contact restent à nommer avant la mise en ligne publique.</p>
      <h2 className="text-heading">Ce qu&apos;on collecte</h2>
      <p>Ton e-mail (si tu crées un compte) et ce que tu écris dans l&apos;app. Rien d&apos;autre : pas de géolocalisation, pas de contacts, pas de traceur publicitaire.</p>
      <p>Évite d&apos;y écrire des informations sur d&apos;autres personnes ou des détails médicaux : ce n&apos;est pas nécessaire pour avancer.</p>
      <h2 className="text-heading">Pourquoi</h2>
      <p>Uniquement pour te fournir le service (base légale : l&apos;exécution des conditions d&apos;utilisation). Tes données ne sont ni vendues, ni partagées, ni analysées par un tiers.</p>
      <h2 className="text-heading">Où c&apos;est stocké</h2>
      <p>Sans compte : uniquement sur cet appareil, dans ce navigateur. Toute personne qui l&apos;utilise peut les voir.</p>
      <p>Avec un compte : dans une base de données hébergée dans l&apos;Union européenne, visible par toi seul·e. Nos prestataires techniques sont Supabase (base de données et connexion) et Vercel (hébergement du site), liés par un contrat de traitement des données ; ce sont des sociétés américaines, les éventuels transferts sont encadrés par les clauses contractuelles types de la Commission européenne.</p>
      <h2 className="text-heading">Idées de l&apos;IA (facultatif)</h2>
      <p>
        Si tu appuies sur « Demander des idées à l&apos;IA » et que tu l&apos;acceptes, le texte de ton objectif (et, selon l&apos;écran, ton « pourquoi », ton
        « comment » ou tes réponses pour creuser une cause) est envoyé à Anthropic (société américaine, modèle Claude) pour te proposer des idées. Rien
        d&apos;autre : ni e-mail, ni identifiant, ni historique. Cap n&apos;enregistre pas la demande ; seules les idées que tu choisis de garder sont
        ajoutées à tes données. Finalité : uniquement te suggérer des idées, à ta demande (base légale : ton consentement, que tu peux retirer à tout
        moment dans Réglages).
      </p>
      <p>
        Anthropic intervient comme sous-traitant, dans le cadre de ses conditions commerciales et de son accord de traitement des données. Selon ces
        conditions, les données envoyées par l&apos;API ne servent pas par défaut à entraîner ses modèles et ne sont conservées que pendant une durée
        limitée. Les données sont traitées hors de l&apos;Union européenne ; ce transfert repose sur les garanties prévues par cet accord (clauses
        contractuelles types de la Commission européenne ou cadre UE–États-Unis de protection des données). Pour le détail, consulte la politique de
        confidentialité d&apos;Anthropic (anthropic.com).
      </p>
      <h2 className="text-heading">Cookies</h2>
      <p>Seulement les cookies nécessaires pour garder ta session ouverte. Aucun cookie de mesure d&apos;audience ou de publicité : il n&apos;y a donc pas de bandeau à accepter.</p>
      <h2 className="text-heading">Combien de temps</h2>
      <p>Tant que ton compte existe. Si tu ne te connectes pas pendant 24 mois, on te prévient par e-mail, puis on supprime le compte 30 jours plus tard. Quand tu supprimes ton compte, tout est effacé immédiatement ; les sauvegardes techniques disparaissent d&apos;elles-mêmes sous quelques jours.</p>
      <h2 className="text-heading">Tes droits</h2>
      <p>Tu peux tout consulter, corriger, exporter (fichier JSON) ou effacer à tout moment depuis les réglages. Tu peux aussi t&apos;opposer à un traitement ou nous écrire (contact à venir), et saisir la CNIL (cnil.fr) si tu estimes que tes droits ne sont pas respectés.</p>
      <p>Cap s&apos;adresse aux personnes de 15 ans et plus.</p>
      <Link href="/connexion" className="inline-flex min-h-11 items-center font-semibold text-primary">
        Retour
      </Link>
    </article>
  );
}
