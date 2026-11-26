# Revue de sécurité — phase 2

> Rôle : expert sécurité. Référentiel : `docs/securite.md` §9.
> Code revu : branche `main` au commit `73df145`, puis mes corrections `650e372` et `71e6f5c`.
> Vérifications lancées après mes corrections : `npm run lint` OK, `npx tsc --noEmit` OK, `npm test` 54/54 OK, `npm run build` OK, `npm audit --audit-level=high` **0 vulnérabilité**. Le serveur de prod a été lancé en local et interrogé avec `curl` pour les en-têtes, le nonce et les redirections.

**Bilan** : aucune faille critique ni élevée. J'ai trouvé **1 faille moyenne** (redirection ouverte) et je l'ai corrigée. Il reste **3 points moyens** non corrigés, qui relèvent du produit ou du codeur, et **quelques points faibles**.

---

## Constats par gravité

| # | Gravité | Constat | Statut |
|---|---|---|---|
| M1 | **Moyenne** | **Redirection ouverte** dans `/auth/callback`. `safeNextPath("/a/../..//evil.example")` renvoyait `//evil.example`. La normalisation par `URL` recréait un `//` en tête, interprété comme une URL de protocole relatif. Après un lien magique valide, la personne pouvait donc être renvoyée vers un site tiers (hameçonnage). | **Corrigé** (`650e372`) : nouveau contrôle du chemin normalisé, et 2 cas ajoutés au test. |
| M2 | Moyenne | **Politique de confidentialité incomplète**. Il manquait la base légale, les sous-traitants et transferts, les cookies, les durées de conservation, le détail des droits et l'âge minimum. | **Corrigé en partie** (`71e6f5c`). Il reste à nommer le **responsable de traitement** et l'**adresse de contact** (décision du superviseur). |
| M3 | Moyenne | **Pas de pages Mentions légales ni CGU**, alors que l'écran de connexion affiche « tu acceptes les CGU ». | Non corrigé. Il faut le contenu de l'éditeur : 2 pages à créer, puis des liens depuis `/connexion` et les Réglages. |
| M4 | Moyenne | **Pas de transfert local → compte ni de purge locale à la connexion.** Après passage en mode compte, `cap:v1:data` reste indéfiniment dans le localStorage (risque « appareil partagé »), sans proposition d'import (§6). | Non corrigé (codeur). À faire : après la première connexion, si des données locales existent, proposer « Importer dans mon compte ? ». Puis `SupabaseRepository.replaceAll` ou un ajout, et `localStorage.removeItem("cap:v1:data")` après succès. |
| F1 | Faible | Les **brouillons** (assistant, bilan, « creuser ») sont écrits dans le localStorage (`cap:v1:brouillon:*`) aussi en mode compte. Ce sont des textes sensibles stockés sur l'appareil. Ils sont bien purgés à la déconnexion et à la suppression. | Non corrigé. Recommandation : `sessionStorage` en mode compte, ou au minimum `clearDraft` dès l'enregistrement (déjà fait au succès). |
| F2 | Faible | `SupabaseRepository` : les identifiants passés en paramètre (`updateGoal`, `deleteGoal`, `addActionLog`, `deleteRecipe`…) ne sont pas validés comme `uuid`. La RLS empêche tout accès croisé ; un id invalide produit seulement une erreur Postgres, convertie en message générique. | Non corrigé. Ajouter `z.uuid()` sur ces paramètres. |
| F3 | Faible | `SupabaseRepository.load()` renvoie les données **non validées** si `capDataSchema` échoue, ce qui contredit son commentaire. Pas de risque XSS, car React échappe le texte. | Non corrigé. Journaliser un code d'erreur (sans contenu) et l'assumer, ou filtrer les lignes invalides. |
| F4 | Faible | Incohérence de bornes : `recipeInputSchema.steps` est limité à 120 caractères par étape, alors que `recipeSchema` (lecture et import) accepte 2 000 au total. C'est un problème fonctionnel, pas de sécurité. | Non corrigé (codeur / data). |
| F5 | Faible | Pas de région Vercel UE configurée. | **Corrigé** (`71e6f5c`) : `vercel.json` avec `regions: ["cdg1"]`. |
| F6 | Faible | `.env.example` ne documentait pas la variable secrète serveur. | **Corrigé** (`71e6f5c`) : `SUPABASE_SECRET_KEY=` vide, avec un commentaire « serveur uniquement ». |
| F7 | Faible | Pas de CI : `npm audit` bloquant, scan de secrets et Dependabot ne sont pas branchés (le repo n'a pas de remote). | Non corrigé. Les ajouter à la création du dépôt GitHub (workflow `npm ci && npm audit --omit=dev --audit-level=high`, push protection, `dependabot.yml`). |
| F8 | Faible | La purge des comptes inactifs (24 mois, §8) n'est pas implémentée. | Non corrigé (expert BDD / ops, `pg_cron`). La politique l'annonce déjà, donc à faire avant l'ouverture publique. |
| I1 | Info | Le matcher du proxy exclut les requêtes de préchargement : c'est le motif officiel de Next. Leurs réponses n'ont pas de CSP mais ne sont pas des documents HTML de navigation. | Accepté. |
| I2 | Info | `supabase/tests/rls_isolation.sql` est présent, mais il n'a pas pu être exécuté faute de projet Supabase. | À lancer (`supabase test db`) dès qu'une base locale ou de dev existe. |
| I3 | Info | Réglages Supabase Auth à faire à la création du projet : Site URL, liste blanche exacte des URL de redirection, protection contre les mots de passe fuités, CAPTCHA si abus, SMTP UE, région `eu-west-3` ou `eu-central-1`. | À faire au déploiement. |
| I4 | Info | HSTS sans `preload` : c'est voulu tant que le domaine définitif n'est pas choisi. | Accepté. |

---

## Checklist §9 cochée

Légende : `[x]` conforme · `[ ]` non conforme ou non vérifiable (voir le constat indiqué).

### Auth & accès
- [x] Seul `@supabase/ssr` est utilisé ; clients séparés `src/lib/supabase/client.ts` et `server.ts`.
- [x] `src/proxy.ts` rafraîchit la session (`getUser()`) et le matcher exclut les assets statiques.
- [x] Les décisions d'accès côté serveur utilisent `getUser()` (Server Action de suppression) ; aucune occurrence de `getSession(`.
- [x] L'autorisation ne repose pas sur le proxy : RLS, plus `getUser()` dans l'action.
- [x] Le callback redirige vers un chemin interne uniquement. **Ce point n'était conforme qu'après la correction M1.**
- [x] `SECRET_KEY` / `SERVICE_ROLE` n'apparaissent que dans `src/lib/supabase/admin.ts` (`import "server-only"`) ; absents de `.next/static` après le build.
- [x] Aucune variable secrète n'est préfixée `NEXT_PUBLIC_`.

### Base / RLS
- [x] Les 13 tables `public` ont la RLS activée (`profiles` explicitement, les 12 autres en boucle).
- [x] Policies select, insert, update et delete en `(select auth.uid()) = user_id` (`= id` pour `profiles`), avec `with check`, rôle `authenticated` ; `revoke all … from anon`.
- [x] `user_id … default auth.uid() … on delete cascade`, plus des index. Les clés étrangères composites `(parent_id, user_id)` empêchent le rattachement croisé.
- [x] Contraintes `check` alignées sur `DB_LIMITS`, que les schémas zod réutilisent.
- [x] `security definer` est limité à `private.handle_new_user` et `private.delete_user_account`, avec une justification, `search_path = ''` et `revoke execute`. `export_my_data` est en `security invoker`.
- [ ] Test d'isolation A/B **présent mais non exécuté** ; Security Advisor non consulté faute de projet (I2).

### En-têtes (vérifiés au `curl` sur `next start`)
- [x] CSP à nonce sur les pages : 15 balises `<script>` sur 15 portent le nonce ; pas de `unsafe-eval` en prod ; `frame-ancestors 'none'`, `object-src 'none'`.
- [x] `connect-src` vaut `'self'` plus le projet Supabase (https et wss) quand l'env est définie au build.
- [x] HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options, COOP et CORP sont présents.
- [x] `poweredByHeader: false` ; pages et callback en `Cache-Control: private, no-store` ; `sw.js` en `no-cache, no-store`.

### Entrées & XSS
- [x] Schémas zod `strictObject` sur la Server Action, le callback (paramètres), toutes les écritures des deux repositories, et la lecture du localStorage (données, préférences, brouillons).
- [x] Aucune occurrence de `dangerouslySetInnerHTML`, `innerHTML`, `eval(` ni `new Function`.
- [x] Aucun `href` dynamique issu d'une saisie libre : seulement des ids internes dans des chemins `/objectifs/…`.
- [x] Les erreurs renvoyées au client sont génériques (`check()` encapsule l'erreur Postgres ; l'action renvoie `{ ok: false }`).
- [x] Pas de Route Handler mutant. Le seul est `/auth/callback`, en GET. La Server Action est protégée par le contrôle d'`Origin` natif de Next.
- [ ] Les identifiants passés aux méthodes Supabase ne sont pas validés en uuid (F2, faible).

### PWA & stockage local
- [x] Le SW laisse passer en réseau : les autres origines (Supabase), `/api/`, `/auth/`, les navigations (repli `/offline`) et les requêtes non-GET.
- [x] Le précache se limite à `/offline` (sans donnée), au manifeste, aux icônes et à `theme-init.js` ; `cacheable()` refuse `Set-Cookie`, `private` et `no-store`.
- [x] `sw.js` est servi en `no-cache`.
- [x] La déconnexion et la suppression appellent `LocalRepository.clear()` (toutes les clés `cap:*`) et `purgeCaches()` (message au SW et `caches.delete`).
- [x] Le localStorage est validé par zod à la lecture ; ni jeton ni e-mail n'y sont stockés.
- [x] Avertissement « appareil partagé » et bouton d'effacement en mode local (Réglages).
- [ ] Pas de transfert local → compte suivi d'une purge (M4) ; des brouillons sensibles persistent en mode compte (F1).

### Secrets, dépendances, logs
- [x] `.env*.local` et `.env` ignorés ; `.env.example` sans valeur ; aucun secret dans les fichiers suivis.
- [x] `npm audit --audit-level=high` : 0 vulnérabilité ; `package-lock.json` commité.
- [x] Dépendances minimales (Next, React, Supabase, zod, Recharts, lucide, server-only).
- [x] Logs : un seul `console.error`, qui ne journalise que le statut HTTP de l'échec de suppression, sans contenu ni e-mail.
- [x] Aucun script ni analytics tiers.
- [ ] CI non configurée : audit bloquant, scan de secrets, Dependabot (F7).

### RGPD
- [x] Export JSON : `export_my_data()` (RLS) en mode compte et `exportData()` en local. En mode compte, il n'est **pas testé en conditions réelles** faute de projet.
- [x] Suppression de compte : double confirmation (« SUPPRIMER »), `getUser()` puis `auth.admin.deleteUser` côté serveur, cascade SQL, purge locale et des caches.
- [ ] La politique de confidentialité est accessible depuis la connexion et les Réglages, **mais il manque les Mentions légales et les CGU** (M3) et le responsable de traitement n'est pas nommé (M2).
- [x] Région Vercel UE (`cdg1`). La région Supabase et le SMTP UE sont à choisir à la création du projet (I3).
- [x] Aucune donnée collectée au-delà de l'e-mail, du prénom facultatif (local uniquement) et du contenu saisi.
- [ ] La purge des comptes inactifs (24 mois) n'est pas implémentée (F8).

---

## Avant l'ouverture publique (bloquant)
1. M3 : rédiger les Mentions légales et les CGU, et nommer le responsable de traitement et le contact (M2).
2. M4 : transfert local → compte, puis purge locale.
3. I2 et I3 : exécuter le test RLS A/B sur une base réelle, consulter le Security Advisor, configurer Supabase Auth et la région UE.
4. F7 et F8 : CI de sécurité et purge des comptes inactifs.

---

# Revue de sécurité — branche `adapter-objectif` (profils d'objectifs et idées de l'IA)

> Code revu : `2fc1689` et `39fed13`, puis ma correction `71f838b`. `main` n'a pas été modifiée.
> Après correction : lint OK, `tsc` OK, `npm test` 97/97 OK, `npm run build` OK, `npm audit --audit-level=high` : 0 vulnérabilité.
> Tests au `curl` sur `next start` : `GET` renvoie `{"disponible":false}` ; `POST` sans `Origin` → 403 ; `POST` même origine sans clé → 503 ; `Cache-Control: private, no-store` et CSP présents.

**Bilan** : aucune faille critique ni élevée. Le point principal non corrigé est le **risque de facture abusive** (M5) : un client hors navigateur peut contourner les protections actuelles.

| # | Gravité | Constat | Statut |
|---|---|---|---|
| M5 | **Moyenne** | **Abus de coût.** La route `POST /api/ia/suggestions` n'exige pas de session, et l'en-tête `Origin` se falsifie librement hors navigateur (la vérification ne protège que du CSRF). La limite de 10 requêtes par 10 min et par IP est **en mémoire, propre à chaque instance serverless** : sur Vercel elle est contournable (plusieurs instances, démarrages à froid, rotation d'IP). Chaque appel coûte des jetons Claude Opus. | Non corrigé (choix d'infrastructure). Il faut : (1) une **limite de dépenses** sur la clé ou l'espace de travail Anthropic ; (2) une **règle de limitation de débit Vercel Firewall (WAF)** sur `/api/ia/*`, ou un compteur partagé (Upstash, Postgres) ; (3) quand Supabase est actif, exiger `getUser()` et limiter par utilisateur. |
| M6 | Moyenne | **Consentement et politique inexacts.** Le texte disait « ton objectif (et seulement lui) » alors que le pourquoi, le comment et les réponses de « creuser » sont aussi envoyés, et le transfert hors UE n'était pas mentionné. La politique affirmait sans réserve qu'Anthropic n'entraîne pas ses modèles avec ces données, qu'il les supprime, et que le transfert repose sur les clauses contractuelles types. | **Corrigé** (`71f838b`) : texte exact, transfert hors UE signalé, garanties formulées « selon ses conditions et son accord de traitement ». **À faire avant la mise en ligne** : accepter le DPA d'Anthropic et vérifier sa base de transfert (CCT ou Data Privacy Framework) et ses durées de conservation, puis ajuster la phrase si besoin. Inscrire Anthropic au registre des traitements. |
| F9 | Faible | **Injection de prompt.** Le texte saisi pouvait contenir `</objectif_utilisateur>` et sortir de l'encadrement. Impact limité : pas d'outils, aucune action possible, sortie validée par zod, et seule la personne elle-même voit le résultat. | **Corrigé** (`71f838b`) : les balises sont retirées des champs avant l'envoi, avec un test. |
| F10 | Faible | La route acceptait un `Content-Type` quelconque. | **Corrigé** : `application/json` exigé, 415 sinon. |
| F11 | Faible | Réglages : l'état « pas encore choisi » (`ia: "inconnu"`) s'affichait comme « Activées ». | **Corrigé** : aucune option sélectionnée, avec une mention « on te demandera ton accord ». |
| F12 | Faible | L'IP vient de `x-forwarded-for` (1re valeur). C'est fiable sur Vercel, qui réécrit l'en-tête, mais falsifiable derrière un autre proxy. | Accepté pour Vercel, à documenter si on change d'hébergeur. |
| F13 | Faible | Le consentement n'est mémorisé que sur l'appareil (`cap:v1:prefs`) : il n'y a pas de preuve côté serveur. | Accepté au MVP (pas d'envoi sans clic explicite). À tracer côté compte si l'usage se généralise. |
| I5 | Info | `req.text()` lit tout le corps avant de contrôler sa longueur quand `Content-Length` est absent. Vercel plafonne de toute façon le corps à 4,5 Mo. | Accepté. |
| I6 | Info | Pas de repli serveur en cas de refus (`fallbacks`) : un refus renvoie `raison: "refus"` et l'interface garde les idées des profils. | Accepté, comportement voulu. |

## Points vérifiés conformes
- [x] **Clé** : `ANTHROPIC_API_KEY` n'est lue que dans `src/lib/ia/claude.ts` (`import "server-only"`). Elle n'a pas de préfixe `NEXT_PUBLIC_` et figure vide dans `.env.example`. Après le build, `.next/static` ne contient ni `ANTHROPIC_API_KEY`, ni `sk-ant`, ni `api.anthropic.com`, ni le prompt. Le SDK n'est importé que côté serveur (le composant client n'importe que des types).
- [x] **Journaux** : aucun `console.*` dans `src/lib/ia` ni dans la route ; les erreurs sont réduites à un code (`refus`, `limite`, `format`…), sans contenu ni détail de l'API.
- [x] **Minimisation** : schéma d'entrée `strictObject` (aucun id, e-mail ni prénom), longueurs bornées, caractères de contrôle refusés, corps limité à 8 Ko, champs « causes » réservés à cette étape.
- [x] **Sortie** : structured outputs (JSON Schema fermé), puis `iaSortieSchema` (zod), avec longueurs bornées, enums et nombres finis. `refusal` et `max_tokens` sont gérés. Le rendu se fait en texte React (puces), sans `dangerouslySetInnerHTML` ; les idées gardées repassent par la validation du repository.
- [x] **Le texte utilisateur ne déclenche rien** : aucun outil déclaré, une seule requête, le prompt système traite le texte comme une donnée.
- [x] **CSP** : inchangée. Le navigateur n'appelle que la même origine (`connect-src 'self'`) et l'appel à Anthropic part du serveur. Le service worker ne met pas `/api/` en cache, et la route répond en `no-store`.
- [x] **Consentement** : demandé au premier clic, jamais d'appel automatique ; « Non merci » masque le bouton ; le choix est réversible dans Réglages. La base légale indiquée est le consentement.
- [x] **Client** : `timeout: 20 s`, `maxRetries: 1`, modèle `claude-opus-5-5`, `effort: "low"`.
