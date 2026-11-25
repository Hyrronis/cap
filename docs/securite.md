# Sécurité & RGPD — app « Cap »

> Rôle : expert sécurité. Exigences **vérifiables** (chaque ligne « DOIT » est testable en revue ou en recette).
> Stack : Next.js App Router (TS) + Supabase (Auth, Postgres, RLS) + Vercel, PWA, mode hors connexion localStorage.
> Les données (objectifs de vie, blocages, causes, « 5 pourquoi ») sont **intimes** : on les traite comme sensibles même si elles ne sont pas des « données de santé » au sens strict de l'art. 9 RGPD — un utilisateur peut y écrire des choses relevant de la santé, de la vie sentimentale, des finances.

---

## 1. Modèle de menaces (court)

**Actifs**
- A1. Contenu utilisateur : objectifs, plans, repères chiffrés, bilans, causes, leçons, recettes.
- A2. Identité : e-mail, session (cookies `sb-*`), jetons d'accès/rafraîchissement.
- A3. Secrets d'infra : clé `service_role` / clé secrète Supabase, jetons Vercel.
- A4. Données locales sur l'appareil (localStorage, cache du service worker).

**Attaquants**
- T1. Autre utilisateur authentifié qui tente de lire/modifier les données d'autrui (IDOR via l'API PostgREST).
- T2. Attaquant web : XSS, injection, CSRF, clickjacking, redirection ouverte après lien magique.
- T3. Personne ayant accès physique à l'appareil (partagé, perdu, conjoint) → lit localStorage / cache.
- T4. Chaîne d'approvisionnement : paquet npm compromis.
- T5. Fuite par négligence : secret commité, logs contenant du contenu utilisateur, outil d'analytics tiers.

**Risques principaux (par priorité)**
1. RLS absente ou trop large → **fuite de toutes les données de tous les utilisateurs** avec la seule clé publique (`anon`/publishable). Risque n°1 sur Supabase.
2. XSS → vol de session et lecture de tout le contenu.
3. Clé `service_role` exposée côté client (préfixe `NEXT_PUBLIC_` ou import dans un composant client).
4. Données lisibles sur un appareil partagé (localStorage, cache SW de réponses authentifiées).
5. Non-conformité RGPD (pas d'export/suppression, hébergement hors UE, traceurs sans consentement).

---

## 2. Authentification Supabase

- **Méthode** : lien magique par e-mail (OTP) par défaut — pas de mot de passe à stocker/réutiliser. Mot de passe optionnel plus tard ; s'il est activé : longueur min **10**, vérification « mot de passe fuité » (HIBP) activée dans Supabase Auth, confirmation d'e-mail obligatoire.
- **Bibliothèque** : `@supabase/ssr` uniquement (pas `@supabase/auth-helpers-nextjs`, obsolète).
  - `createBrowserClient` dans les composants client, `createServerClient` dans Server Components / Route Handlers / Server Actions / middleware, avec l'adaptateur cookies `getAll`/`setAll`.
  - Le middleware (`middleware.ts`, ou `proxy.ts` à partir de Next 16) **DOIT** rafraîchir la session à chaque requête (voir §3, même fichier que la CSP).
- **Autorisation côté serveur** : utiliser `supabase.auth.getUser()` (ou `getClaims()`, qui vérifie la signature du JWT), **jamais** `getSession()` seul pour décider d'un accès — `getSession()` lit le cookie sans le revalider.
- **Cookies de session** : posés par `@supabase/ssr` ; vérifier en prod `Secure`, `SameSite=Lax`, `Path=/`. Pas de jeton dans localStorage en mode connecté (le client navigateur `@supabase/ssr` utilise les cookies).
- **Callback du lien magique** (`/auth/callback` ou `/auth/confirm`) : échange `code`/`token_hash` côté serveur (`exchangeCodeForSession` / `verifyOtp`), puis redirection **uniquement vers un chemin relatif interne** (refuser tout `next=` qui ne commence pas par `/` ou qui commence par `//`).
- **Supabase Auth – réglages** : `Site URL` = domaine de prod ; « Redirect URLs » = liste blanche exacte (prod + `http://localhost:3000/**` en dev, pas de joker `*.vercel.app`) ; durée du JWT 3600 s ; rotation des refresh tokens activée ; rate limits par défaut conservés ; CAPTCHA (hCaptcha/Turnstile) sur l'envoi du lien magique si abus constatés.
- **Déconnexion** : `signOut()` + purge du cache SW utilisateur et des données locales (voir §6–7).
- **Clés** : côté client, uniquement l'URL et la clé `anon` / *publishable* (`sb_publishable_…`). La clé `service_role` / *secret* (`sb_secret_…`) n'est **jamais** dans le bundle, jamais préfixée `NEXT_PUBLIC_`, et n'est utilisée que dans du code serveur marqué `import 'server-only'` (cas unique prévu : suppression de compte, §9).

### RLS (obligatoire)
- **Toutes** les tables du schéma `public` ont `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` — aucune exception, même les tables de référence (pour elles : policy `select` seule).
- Chaque table de contenu a une colonne `user_id uuid not null default auth.uid() references auth.users on delete cascade`.
- Policies séparées par opération, rôle `authenticated` seulement :
  ```sql
  create policy "own_select" on public.goals for select to authenticated using ((select auth.uid()) = user_id);
  create policy "own_insert" on public.goals for insert to authenticated with check ((select auth.uid()) = user_id);
  create policy "own_update" on public.goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  create policy "own_delete" on public.goals for delete to authenticated using ((select auth.uid()) = user_id);
  ```
- Tables enfants (actions, repères, mesures, bilans, causes…) : soit `user_id` dénormalisé + même policy, soit `exists (select 1 from goals g where g.id = goal_id and g.user_id = (select auth.uid()))`. Préférer `user_id` dénormalisé (plus simple, plus rapide) + index sur `user_id`.
- Aucun accès `anon` aux tables de contenu (`revoke all on … from anon` ou simplement aucune policy pour `anon`).
- Fonctions `security definer` : interdites sauf justification ; si utilisées, `set search_path = ''` et placées hors du schéma exposé.
- Vues : `with (security_invoker = true)`.
- **Test obligatoire** : script SQL/pgTAP ou test d'intégration qui, avec l'utilisateur B, tente `select/update/delete` sur une ligne de A et obtient 0 ligne / erreur. Lancer `supabase db lint` et l'onglet *Security Advisor* : 0 alerte « RLS disabled ».

---

## 3. En-têtes HTTP

### 3.1 CSP stricte avec nonce (+ rafraîchissement de session) — `middleware.ts` à la racine (renommer `proxy.ts` et exporter `proxy` en Next 16+)

```ts
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_WS = SUPABASE_URL.replace(/^https:/, 'wss:');

function buildCsp(nonce: string) {
  const isDev = process.env.NODE_ENV !== 'production';
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`, // requis : styles inline de Recharts / next/font
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'${SUPABASE_URL ? ` ${SUPABASE_URL} ${SUPABASE_WS}` : ''}`,
    `worker-src 'self'`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp); // Next lit le nonce ici et l'applique à ses scripts

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  if (SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser(); // rafraîchit la session ; ne rien insérer entre createServerClient et cet appel
  }

  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
```

Conséquences à respecter :
- Le nonce impose le **rendu dynamique** des pages (pas de pages statiques mises en cache CDN avec un nonce figé). C'est acceptable pour une app authentifiée. Ne pas ajouter `export const dynamic = 'force-static'`.
- Tout `<Script>` tiers doit recevoir `nonce={(await headers()).get('x-nonce')}`. Idéalement : **aucun script tiers**.
- Si un jour l'équipe préfère une CSP statique (sans middleware) : `script-src 'self' 'unsafe-inline'` est le seul repli fonctionnel — **à refuser** sauf décision écrite.
- Vérifier en prod : console sans violation CSP ; `curl -sI https://<domaine>/ | grep -i content-security-policy` présent et sans `unsafe-eval`.

### 3.2 Autres en-têtes — `next.config.ts`

```ts
// next.config.ts
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' }, // doublon historique de frame-ancestors 'none'
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- `preload` HSTS : n'activer qu'une fois le domaine définitif choisi (pas sur `*.vercel.app`).
- Réponses de l'API / pages authentifiées : `Cache-Control: private, no-store` (Route Handlers : le poser explicitement).
- Vérification : score A+ sur securityheaders.com et observatory.mozilla.org.

---

## 4. Validation des entrées & XSS

- **zod** sur **toute** entrée qui franchit une frontière : formulaires (client, pour l'UX), Server Actions et Route Handlers (serveur, **obligatoire** — la validation client ne compte pas), lecture du localStorage (données potentiellement altérées), import de fichier d'export.
- Utiliser `.strict()` sur les objets (refuser les champs inconnus, ex. `user_id` injecté), `safeParse` et réponse 400 générique.
- **Limites** (à reprendre à l'identique en contrainte SQL `check (char_length(x) <= N)`) :

  | Champ | Limite |
  |---|---|
  | Titre d'objectif, d'action, de repère, de cause | 1–120 caractères |
  | Champs QQOQCCP, réponses de bilan, « pourquoi », leçons | 0–1 000 caractères |
  | Recette (routine) | 0–2 000 caractères |
  | Valeur de repère | nombre fini, `-1e9 … 1e9`, 2 décimales |
  | Unité | 0–20 caractères |
  | Nb d'actions / repères par semaine | 1–3 (règle métier) |
  | Nb de « pourquoi » | ≤ 5 ; familles Ishikawa : enum des 5 valeurs |
  | Dates | ISO 8601 (`z.string().date()` / `datetime()`) |
  | Identifiants | `z.string().uuid()` |
  | Fichier d'import | ≤ 2 Mo, JSON uniquement |

- Normaliser : `trim()`, refuser les caractères de contrôle (`/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/`).
- **XSS** : rendu React par défaut uniquement (échappement automatique). **Interdits** : `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `href`/`src` construits à partir de saisie utilisateur sans vérifier le schéma (`https:` uniquement). Pas de rendu Markdown du contenu utilisateur au MVP ; si besoin plus tard → `react-markdown` sans `rehype-raw`.
- Libellés Recharts (tooltips, axes) : passer des chaînes, pas de HTML.
- **CSRF** : Server Actions protégées nativement par Next (vérif. `Origin`). Route Handlers mutants : vérifier `Origin` == domaine, accepter uniquement `application/json`.
- **SQL** : uniquement le client Supabase (requêtes paramétrées). Pas de `rpc` avec SQL dynamique concaténé.
- **Erreurs** : messages génériques à l'utilisateur ; jamais de stack ou d'erreur Postgres brute renvoyée au client.

---

## 5. Service worker / PWA

- Bibliothèque : **Serwist** (`@serwist/next`) ou SW écrit à la main ; pas de `next-pwa` non maintenu.
- **Peut être mis en cache** (precache / cache-first) : `/_next/static/**` (fichiers hachés), icônes, polices locales, `manifest.webmanifest`, une page `/offline` statique sans donnée personnelle.
- **Ne DOIT JAMAIS être mis en cache** :
  - toute requête vers `*.supabase.co` (REST, Auth, Realtime, Storage) → `NetworkOnly` ;
  - `/api/**`, `/auth/**`, toute réponse portant `Set-Cookie` ou `Cache-Control: private/no-store` ;
  - les navigations HTML des pages authentifiées (le HTML RSC contient les données de l'utilisateur) → `NetworkOnly` avec repli sur `/offline` ;
  - les requêtes non-GET.
- Le SW est servi depuis `/sw.js` (scope `/`), en `no-cache` (§3.2), même origine.
- À la déconnexion et à la suppression de compte : `caches.keys()` → supprimer tous les caches non-statiques ; `postMessage` au SW pour qu'il fasse de même.
- Les données hors connexion vivent dans le repository local (§6), pas dans le cache HTTP du SW.
- Vérification : DevTools → Application → Cache Storage après une session : aucune entrée `supabase.co`, `/api/`, ni page HTML authentifiée.

---

## 6. localStorage (mode hors connexion / prototype)

**Risques** : lisible par tout script de la même origine (donc par une XSS) ; lisible par quiconque accède à l'appareil/profil navigateur ; non chiffré ; persistant indéfiniment ; modifiable par l'utilisateur (données non fiables) ; ~5 Mo max.

**Mesures**
- Bandeau d'information au premier lancement en mode local : « Tes données restent sur cet appareil, dans ce navigateur. Toute personne qui l'utilise peut les voir. » + lien « Effacer mes données de cet appareil ».
- Une seule clé préfixée et versionnée (`cap:v1:data`) ; schéma validé par zod à **chaque lecture** ; en cas d'échec → ne pas planter, proposer export brut + réinitialisation.
- Jamais de jeton, d'e-mail, de clé ou de secret dans localStorage (les jetons Supabase sont en cookies, §2).
- Bouton « Effacer toutes mes données locales » (supprime les clés `cap:*` + caches SW).
- Export JSON disponible aussi en mode local (portabilité).
- Passage local → compte : migration explicite proposée (« Importer mes données dans mon compte ? »), insertion via le client authentifié (RLS s'applique), puis **purge** des données locales après succès.
- Chiffrement côté client (WebCrypto) : **non requis au MVP** (la clé serait elle aussi sur l'appareil, gain faible) ; à réévaluer si un code PIN local est ajouté.
- La protection principale reste l'absence de XSS (§3–4).

---

## 7. Secrets, environnement, dépendances, journalisation

**Secrets / variables**
- Seules variables `NEXT_PUBLIC_*` autorisées : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ou `…_PUBLISHABLE_KEY`), éventuellement `NEXT_PUBLIC_SITE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY` (ou `SUPABASE_SECRET_KEY`) : uniquement dans Vercel (environnements *Production* et *Preview* séparés, marquée *Sensitive*), lue dans un module `server-only`.
- `.env*.local` dans `.gitignore` ; un `.env.example` sans valeurs est commité.
- Scan de secrets : GitHub secret scanning + push protection activés (ou `gitleaks` en CI).
- Previews Vercel : protégées (Vercel Authentication) et branchées sur un projet Supabase de **dev**, jamais sur la base de prod.

**Dépendances**
- `package-lock.json` commité ; installation CI par `npm ci`.
- `npm audit --omit=dev --audit-level=high` en CI : **échec du build** si vulnérabilité haute/critique non justifiée.
- Dependabot (ou Renovate) activé, mises à jour de sécurité hebdomadaires.
- Nouvelle dépendance = justifiée dans la PR (maintenance active, popularité, pas de script `postinstall` douteux). Minimiser : pas de lib pour ce que la plateforme fait déjà.
- Next.js maintenu sur une version patchée (suivre les avis de sécurité Next, ex. contournement de middleware CVE-2025-29927 : ne jamais faire reposer l'autorisation **uniquement** sur le middleware — RLS + `getUser()` côté serveur).

**Journalisation**
- Interdit dans les logs (serveur, `console.*`, Sentry, Vercel) : contenu saisi (titres, bilans, causes…), e-mail, jetons, cookies, corps de requêtes.
- Autorisé : identifiant technique (UUID utilisateur) si nécessaire, route, code HTTP, durée, code d'erreur interne.
- Supprimer les `console.log` de données en prod (règle ESLint `no-console` en `warn`, sauf `console.error` avec message générique).
- Outil d'erreurs (si ajouté, ex. Sentry région UE) : `sendDefaultPii: false`, scrubbing des `request.data`, pas de session replay.
- Pas d'analytics tiers au MVP. Si besoin : mesure d'audience sans cookie et hébergée UE (ex. Plausible/Vercel Web Analytics sans cookie), sinon consentement (§8).

---

## 8. RGPD

- **Responsable de traitement** : à nommer (personne/entité éditrice) — à compléter avant mise en ligne publique.
- **Base légale** : exécution du contrat (CGU) pour le service ; consentement uniquement pour ce qui n'est pas nécessaire (analytics à cookies, e-mails de relance).
- **Minimisation**
  - Données collectées : e-mail (auth) + contenu saisi par l'utilisateur + horodatages. **Rien d'autre** : pas de nom réel obligatoire (prénom/pseudo facultatif), pas de date de naissance, pas de géolocalisation, pas de contacts.
  - Pas de contenu utilisateur envoyé à un tiers (pas d'IA externe, pas d'analytics) sans nouvelle analyse + information.
  - Avertissement doux dans les champs libres « Creuser la cause » : « Évite d'écrire des informations sur d'autres personnes ou des données médicales détaillées. »
- **Consentement / traceurs** : au MVP, seuls des cookies strictement nécessaires (session Supabase) → **pas de bandeau cookies requis**. Le documenter dans la politique. Tout ajout de traceur non essentiel impose un bandeau avec « Refuser » aussi visible qu'« Accepter ».
- **Droits de la personne**
  - **Export** (accès + portabilité) : bouton « Télécharger mes données » → JSON de toutes les tables de l'utilisateur, généré via le client authentifié (RLS) — disponible en mode local et connecté.
  - **Rectification** : tout est éditable dans l'app.
  - **Suppression du compte** : bouton dans « Mon compte », double confirmation (saisir « SUPPRIMER »), Server Action qui : vérifie `getUser()`, appelle `auth.admin.deleteUser(user.id)` avec la clé secrète (module `server-only`), les tables sont purgées par `on delete cascade`, puis déconnexion + purge locale (§5–6). Effet **immédiat**, confirmation par e-mail facultative.
  - Contact pour exercer ses droits : adresse e-mail dédiée affichée dans la politique.
- **Hébergement UE**
  - Projet Supabase en région **`eu-central-1` (Francfort)** ou **`eu-west-3` (Paris)** / `eu-west-1` (Irlande). Choix recommandé : `eu-west-3` ou `eu-central-1`.
  - Vercel : fonctions en région UE (`regions: ['cdg1']` ou `['fra1']` dans `vercel.json`), pour que le traitement serveur reste proche de la base.
  - Sous-traitants à lister : Supabase (DPA signé dans le dashboard), Vercel (DPA), fournisseur SMTP des e-mails d'auth (configurer un SMTP UE, ex. Brevo, plutôt que le SMTP Supabase par défaut limité). Transferts hors UE (sociétés US) couverts par le Data Privacy Framework / CCT — à mentionner.
- **Durée de conservation**
  - Compte actif : tant que le compte existe.
  - Compte inactif **24 mois** : e-mail de prévenance, puis suppression 30 jours après sans reconnexion (tâche planifiée `pg_cron` / cron Vercel).
  - Après suppression : données supprimées immédiatement de la base ; les sauvegardes Supabase s'écrasent en ≤ 7 jours (plan gratuit) / selon plan — à indiquer.
  - Logs techniques : ≤ 30 jours (rétention Vercel/Supabase par défaut, sans contenu personnel).
- **Mentions à afficher**
  - Page **Mentions légales** (éditeur, hébergeur : Vercel Inc. + Supabase).
  - Page **Politique de confidentialité** en langage clair (tutoiement OK) : données collectées, finalité, base légale, destinataires/sous-traitants, localisation UE, durées, droits (accès, rectification, effacement, portabilité, opposition), contact, droit de réclamation auprès de la **CNIL**.
  - Lien vers la politique **sur l'écran de connexion** (« En continuant, tu acceptes les CGU et la politique de confidentialité ») et dans le pied de page / menu compte.
  - **CGU** courtes ; âge minimum **15 ans** (majorité numérique en France) — cible 25-45, on l'affirme dans les CGU.
- **Registre des traitements** et analyse rapide (AIPD allégée) à tenir dans `docs/` avant ouverture publique, vu la sensibilité des contenus.

---

## 9. Checklist de revue de code

### Auth & accès
- [ ] Seul `@supabase/ssr` est utilisé ; clients navigateur/serveur séparés (`lib/supabase/client.ts`, `server.ts`).
- [ ] Middleware/proxy rafraîchit la session (`getUser()`), matcher exclut les assets statiques.
- [ ] Toute décision d'accès serveur utilise `getUser()`/`getClaims()`, jamais `getSession()` seul.
- [ ] L'autorisation ne repose pas uniquement sur le middleware.
- [ ] Callback d'auth : redirection limitée aux chemins internes (`/…`, pas `//…`, pas d'URL absolue).
- [ ] Aucune occurrence de `service_role` / `SECRET_KEY` hors fichiers `import 'server-only'` (`grep -rn "service_role\|SECRET_KEY" app components lib`).
- [ ] Aucune variable secrète préfixée `NEXT_PUBLIC_`.

### Base / RLS
- [ ] Chaque table `public` : `enable row level security` présent dans la migration.
- [ ] Policies select/insert/update/delete avec `(select auth.uid()) = user_id`, `with check` sur insert/update, rôle `authenticated`.
- [ ] `user_id … default auth.uid() … on delete cascade` + index.
- [ ] Contraintes `check` de longueur alignées sur les schémas zod.
- [ ] Aucune fonction `security definer` non justifiée ; `search_path` fixé ; vues `security_invoker`.
- [ ] Test d'isolation A/B présent et vert ; Security Advisor Supabase sans alerte.

### En-têtes
- [ ] CSP à nonce envoyée sur les pages ; pas de `unsafe-eval` en prod ; `frame-ancestors 'none'`, `object-src 'none'`.
- [ ] `connect-src` limité à `'self'` + projet Supabase (https + wss).
- [ ] HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options, COOP présents (`curl -sI`).
- [ ] `poweredByHeader: false` ; réponses authentifiées en `Cache-Control: private, no-store`.

### Entrées & XSS
- [ ] Schéma zod `.strict()` sur chaque Server Action / Route Handler / lecture localStorage / import.
- [ ] Aucune occurrence de `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function` (`grep`).
- [ ] Aucun `href`/`src` dynamique issu de la saisie sans contrôle du schéma.
- [ ] Erreurs renvoyées au client génériques (pas d'erreur Postgres brute).
- [ ] Route Handlers mutants : contrôle `Origin` + `Content-Type: application/json`.

### PWA & stockage local
- [ ] SW : `NetworkOnly` pour `*.supabase.co`, `/api/**`, `/auth/**`, navigations authentifiées et non-GET.
- [ ] Precache limité aux assets statiques + `/offline` sans donnée.
- [ ] `sw.js` servi en `no-cache`.
- [ ] Déconnexion/suppression purgent caches SW et clés `cap:*`.
- [ ] Données localStorage validées par zod à la lecture ; aucun jeton/e-mail stocké.
- [ ] Bandeau « données sur cet appareil » + bouton d'effacement en mode local.

### Secrets, dépendances, logs
- [ ] `.env*.local` ignoré ; `.env.example` sans valeur ; aucun secret dans l'historique git.
- [ ] `npm audit --omit=dev --audit-level=high` propre (ou exceptions justifiées) ; lockfile commité.
- [ ] Nouvelles dépendances justifiées.
- [ ] Aucun log de contenu utilisateur, e-mail, jeton ou corps de requête.
- [ ] Pas de script/analytics tiers non validé.

### RGPD
- [ ] Export JSON complet fonctionnel (local et connecté), testé avec un compte rempli.
- [ ] Suppression de compte : double confirmation, `auth.admin.deleteUser` côté serveur, cascade vérifiée (0 ligne restante), purge locale.
- [ ] Liens Politique de confidentialité + Mentions légales + CGU sur l'écran de connexion et dans le menu.
- [ ] Région Supabase UE et région Vercel UE configurées ; SMTP UE.
- [ ] Aucune donnée collectée au-delà de l'e-mail et du contenu saisi.
- [ ] Tâche de purge des comptes inactifs (24 mois) prévue.

---

## Résumé (5 lignes)
1. Risque n°1 : RLS — toutes les tables en RLS, policies `auth.uid() = user_id` par opération, test d'isolation A/B obligatoire.
2. Auth par lien magique via `@supabase/ssr` (cookies), `getUser()` côté serveur, clé secrète uniquement en `server-only` pour la suppression de compte.
3. CSP à nonce dans le middleware + HSTS/nosniff/Referrer/Permissions/frame-ancestors dans `next.config.ts` ; zod `.strict()` + limites de longueur partout, zéro `dangerouslySetInnerHTML`.
4. Le service worker ne met en cache que les assets statiques — jamais Supabase, `/api`, `/auth` ni le HTML authentifié ; localStorage validé, effaçable, sans jeton, avec avertissement « appareil partagé ».
5. RGPD : minimisation (e-mail + contenu), hébergement UE (Supabase eu-west-3/eu-central-1, Vercel cdg1/fra1), export JSON, suppression immédiate du compte, conservation 24 mois d'inactivité, politique + mentions visibles dès la connexion.
