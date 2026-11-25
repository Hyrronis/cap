# Base de données — Cap

Rôle : expert base de données.
Fichiers :
- `supabase/migrations/20261125000000_init.sql` : la migration (schéma, RLS, triggers, fonctions RGPD).
- `supabase/tests/rls_isolation.sql` : test d'isolation A/B qui s'arrête à la première erreur (exigence de `docs/securite.md` §2).
- `src/lib/db-types.ts` : types TypeScript des lignes (snake_case), type `Database` pour `createClient<Database>()` et constante `DB_LIMITS`, qui reprend les bornes SQL pour zod.

Aucun projet Supabase n'existe pour l'instant. La migration a été validée sur un PostgreSQL 16 local, avec un schéma `auth` factice (voir « Validation » plus bas).

## 1. Tables

Toutes les tables sont dans le schéma `public`. Chaque table a une clé `id uuid` (sauf `profiles`, dont la clé est l'id de `auth.users`), un `user_id` (valeur par défaut `auth.uid()`), un `created_at` et, si la ligne peut être modifiée, un `updated_at` tenu à jour par trigger.

| Table | Étape de la boucle | Contenu | Contraintes notables |
|---|---|---|---|
| `profiles` | Compte | Nom affiché, fuseau horaire (`Europe/Paris` par défaut), langue, date de fin d'accueil | PK = `auth.users.id`, créée par trigger à l'inscription |
| `goals` | Viser | Titre, icône, pourquoi, domaine, statut, champs SMART (`smart_*`) et QQOQCCP (`qq_*`), dates de début, d'échéance et d'atteinte | `domain` ∈ sante/argent/travail/relations/autre ; `status` ∈ actif/atteint/en_pause/abandonne ; échéance ≥ début ; `achieved_on` seulement si atteint |
| `cycles` | Planifier, Ajuster | Une semaine d'un objectif : lundi de début, statut, intention | `week_start` est toujours un lundi ; unique (`goal_id`, `week_start`) ; `status` ∈ en_cours/termine |
| `planned_actions` | Planifier | Actions de la semaine : libellé, nombre de fois prévu, jours suggérés, ordre | `target_count` de 1 à 21 ; `days` ⊂ {1..7} |
| `action_logs` | Agir | Une coche : action faite tel jour, avec une note facultative | unique (`action_id`, `done_on`) : une coche par jour au plus |
| `markers` | Planifier | Repère chiffré d'un objectif : nom, unité, valeur de départ, cible, sens, regroupement des saisies de la semaine | `direction` ∈ plus_haut/plus_bas ; `aggregation` ∈ sum/avg/last (`sum` par défaut) ; `archived_at` pour retirer un repère sans perdre l'historique |
| `marker_measurements` | Agir | Une valeur notée pour un repère, à une date | `numeric(12,2)` entre -1e9 et 1e9 |
| `weekly_reviews` | Faire le bilan | Ce qui a marché, ce qui a bloqué, ce que je change, verdict | un bilan par cycle ; `verdict` ∈ avance/bloque |
| `blocker_analyses` | Creuser la cause | Problème, cause racine retenue, décision, bilan d'origine | `review_id` facultatif, mis à NULL si le bilan est supprimé |
| `blocker_whys` | Creuser la cause | Les 5 pourquoi, dans l'ordre | `position` de 1 à 5, unique par analyse |
| `blocker_causes` | Tour des causes, ce qui pèse le plus | Cause, famille, poids | `family` ∈ moi/temps/environnement/moyens/methode ; `weight` de 1 à 5 |
| `lessons` | Ce que j'en retiens | Une leçon (texte, ordre), liée à un objectif si besoin | gardée si l'objectif est supprimé (`goal_id` mis à NULL) |
| `recipes` | Ma recette qui marche | Titre, déclencheur (« quand… »), étapes, fréquence, domaine | `steps text[]` (20 au plus, sans valeur NULL) ; gardée si l'objectif est supprimé |

Fonctions :

| Fonction | Rôle | Sécurité |
|---|---|---|
| `private.set_updated_at()` | Trigger `BEFORE UPDATE` sur toutes les tables modifiables | `search_path = ''` |
| `private.handle_new_user()` | Trigger `AFTER INSERT` sur `auth.users` : crée le profil (avec `display_name` lu dans les métadonnées d'inscription) | `security definer`, nécessaire pour écrire dans `profiles` pendant l'inscription ; `search_path = ''` ; `EXECUTE` retiré à tous les rôles client |
| `public.export_my_data()` | Renvoie toutes mes données en un `jsonb` (export RGPD) | `security invoker` : la RLS s'applique, on ne voit que ses lignes |
| `private.delete_user_account(uuid)` | Supprime une ligne `auth.users`, ce qui efface tout le reste en cascade. Prévue pour les tâches internes : purge des comptes inactifs par `pg_cron`, demande traitée à la main | `security definer`, nécessaire pour supprimer dans `auth` ; `search_path = ''` ; exécutable seulement par `service_role` et `postgres` ; hors de l'API |

Le schéma `private` n'est pas exposé par PostgREST, et `anon` et `authenticated` n'y ont aucun droit (`docs/securite.md` §2 : pas de `security definer` dans un schéma exposé). Il n'y a **pas** de RPC « supprimer mon compte ». Depuis l'app, la suppression passe par une Server Action : `getUser()`, puis `auth.admin.deleteUser(user.id)` avec la clé secrète, dans un module `server-only` (`docs/securite.md` §8). La cascade depuis `auth.users` fait le reste.

Index : un index commence par `user_id` sur chaque table, ce qui accélère les filtres RLS. Il y a aussi un index sur chaque clé étrangère et sur les accès les plus courants : objectifs par statut, cycles par semaine, coches par jour, mesures par repère et par date, causes par poids.

## 2. Diagramme

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "a"
    AUTH_USERS ||--o{ GOALS : "possède"
    GOALS ||--o{ CYCLES : "semaines"
    CYCLES ||--o{ PLANNED_ACTIONS : "prévoit"
    PLANNED_ACTIONS ||--o{ ACTION_LOGS : "coches"
    GOALS ||--o{ MARKERS : "repères"
    MARKERS ||--o{ MARKER_MEASUREMENTS : "mesures"
    CYCLES ||--o| WEEKLY_REVIEWS : "bilan"
    GOALS ||--o{ BLOCKER_ANALYSES : "creuser"
    WEEKLY_REVIEWS |o--o{ BLOCKER_ANALYSES : "déclenche"
    BLOCKER_ANALYSES ||--o{ BLOCKER_WHYS : "5 pourquoi"
    BLOCKER_ANALYSES ||--o{ BLOCKER_CAUSES : "causes"
    GOALS |o--o{ LESSONS : "leçons"
    GOALS |o--o{ RECIPES : "recettes"

    GOALS {
        uuid id PK
        uuid user_id FK
        text title
        text why
        text domain
        text status
        date start_date
        date target_date
        date achieved_on
    }
    CYCLES {
        uuid id PK
        uuid goal_id FK
        date week_start "lundi"
        text status
    }
    PLANNED_ACTIONS {
        uuid id PK
        uuid cycle_id FK
        text label
        smallint target_count
    }
    ACTION_LOGS {
        uuid id PK
        uuid action_id FK
        date done_on
    }
    MARKERS {
        uuid id PK
        uuid goal_id FK
        text name
        text unit
        numeric target
        text direction
        text aggregation "sum, avg, last"
    }
    MARKER_MEASUREMENTS {
        uuid id PK
        uuid marker_id FK
        numeric value
        date measured_on
    }
    WEEKLY_REVIEWS {
        uuid id PK
        uuid cycle_id FK "unique"
        text verdict
    }
    BLOCKER_ANALYSES {
        uuid id PK
        uuid goal_id FK
        uuid review_id FK
        text problem
    }
    BLOCKER_WHYS {
        uuid analysis_id FK
        smallint position "1 à 5"
        text answer
    }
    BLOCKER_CAUSES {
        uuid analysis_id FK
        text family
        smallint weight "1 à 5"
    }
```

Le diagramme ne montre pas `user_id`, présent dans toutes les tables. Chaque `user_id` pointe vers `auth.users` avec `ON DELETE CASCADE`.

## 3. Choix faits

1. **Isolation par utilisateur, à deux niveaux.**
   - La RLS est activée sur les 13 tables. Il y a 4 politiques par table (select, insert, update, delete), réservées au rôle `authenticated`, avec la condition `(select auth.uid()) = user_id`. Pour `profiles`, la condition porte sur `id`. Écrit avec `select`, `auth.uid()` n'est calculé qu'une fois par requête et non pour chaque ligne. Pour `update`, `with check` empêche de « donner » une ligne à quelqu'un d'autre.
   - Les tables enfants pointent vers leur parent par une **clé étrangère composite** `(parent_id, user_id) → parent(id, user_id)`. Il faut le savoir : le contrôle d'une clé étrangère ne passe pas par la RLS. Avec une clé simple, une personne qui connaît l'UUID d'un objet appartenant à quelqu'un d'autre pourrait y rattacher ses propres lignes. Avec la clé composite, c'est impossible, et le contrôle est fait par Postgres lui-même, sans trigger. Ce cas a été testé.
   - Les droits du rôle `anon` sont retirés sur toutes les tables, en plus de la RLS.
   - Les fonctions `security definer` sont dans `private`, un schéma non exposé, et chacune a une justification en commentaire dans la migration.
2. **`user_id` est rempli par la base** (`default auth.uid()`). L'app ne l'envoie jamais. Les types `*Insert` le laissent facultatif uniquement pour la compatibilité avec supabase-js.
3. **Codes en `text` + `CHECK`, pas en `ENUM`.** Il est plus simple d'ajouter une valeur à un CHECK que de faire évoluer un ENUM, et le résultat dans PostgREST est le même. Les codes sont en français sans accent, comme dans la demande et dans l'interface : `actif`, `en_pause`, `plus_haut`, `avance`, `bloque`… Le domaine applicatif (`src/lib/domain/types.ts`) utilise des codes anglais pour le statut, le sens et le verdict. Les tables de correspondance (`GOAL_STATUS_TO_DOMAIN`, `VERDICT_FROM_DOMAIN`…) sont fournies dans `db-types.ts` pour la couche repository.
4. **5 pourquoi et causes dans des tables à part**, plutôt qu'en tableaux. L'ordre est garanti par `position` (unique, de 1 à 5). Les causes peuvent être triées par poids côté SQL (Pareto) et modifiées une par une.
5. **Les leçons et recettes survivent à leur objectif.** Elles utilisent `ON DELETE SET NULL (goal_id)`, une syntaxe de PostgreSQL 15 et plus, disponible sur Supabase. Seul `goal_id` est vidé, `user_id` reste en place, et la clé composite reste possible. Même principe pour `blocker_analyses.review_id`.
6. **Les repères sont rattachés à l'objectif, pas à la semaine.** On suit ainsi une courbe continue d'une semaine à l'autre. `archived_at` permet de retirer un repère du plan sans perdre ses mesures.
7. **`week_start` est toujours un lundi** (`CHECK isodow = 1`), et un objectif n'a qu'un cycle par semaine. C'est la même convention que `weekStart()` côté domaine.
8. **Regroupement des repères (`aggregation`).** Ce champ indique comment résumer les saisies d'une semaine pour le graphique et le bilan : `sum` pour un cumul (km, € épargnés), `avg` pour une moyenne (heures de sommeil), `last` pour la dernière valeur (poids). Le calcul est fait par l'app. La base ne stocke que la règle.
9. **Règles laissées à l'app** (un trigger serait fragile ou trop rigide pour ces règles d'ergonomie) : 1 à 3 actions et 1 à 3 repères par semaine ; coche datée dans la semaine du cycle ; déclenchement de « Creuser la cause » après 2 bilans « bloque » de suite.
10. **RGPD.** Toutes les clés étrangères mènent à `auth.users` avec `ON DELETE CASCADE`. Supprimer l'utilisateur, avec `auth.admin.deleteUser` ou `private.delete_user_account`, efface donc tout immédiatement. Le test le vérifie. `export_my_data()` fournit l'export complet en JSON. Le projet Supabase devra être créé dans une région UE : `eu-west-3` (Paris) ou `eu-central-1` (Francfort).
11. **Bornes alignées sur `docs/securite.md` §4.** Ce sont les mêmes valeurs que zod, reprises dans `DB_LIMITS` :

    | Champ | CHECK SQL |
    |---|---|
    | Titres : objectif, action, repère, cause, recette | 1 à 120 caractères (après `btrim`) |
    | `why`, SMART, QQOQCCP, réponses de bilan, pourquoi, leçons, problème, cause racine, décision | 1 000 au plus |
    | Recette : total des étapes | 2 000 au plus, 20 étapes au plus ; déclencheur : 1 000 au plus |
    | Unité | 20 au plus |
    | Valeur, cible et valeur de départ d'un repère | `numeric(12,2)`, entre -1e9 et 1e9 |
    | Nombre de pourquoi | 5 au plus (`position` de 1 à 5) ; familles : les 5 valeurs |
    | Autres : nom affiché 80, note de coche 500, intention de semaine 500, icône 32, fréquence 100 | |

    Le refus des caractères de contrôle et le `trim` restent du ressort de zod (§4). La base ne fait que borner les longueurs.

### Écarts avec le domaine applicatif (pour la couche repository)

| Domaine (`domain/types.ts`) | Base |
|---|---|
| `Week` / `weekId` | `cycles` / `cycle_id` |
| `PlannedAction.goalId`, `WeeklyReview.goalId`, `weekStart` | non stockés, obtenus par jointure via `cycles` (`select('*, cycles(goal_id, week_start)')`) |
| `GoalStatus` `active/paused/achieved/abandoned` | `actif/en_pause/atteint/abandonne` |
| `MarkerDirection` `up/down` | `plus_haut/plus_bas` |
| `WeeklyVerdict` `progress/stuck` | `avance/bloque` |
| `SmartCriteria.deadline` | `target_date` (et `smart_time_bound` pour le texte libre) |
| `GoalContext.why` | `why` |
| `RootCauseAnalysis.whys[]`, `causes[]` | tables `blocker_whys`, `blocker_causes` |
| `Lesson.text` / `Recipe.when` | `content` / `trigger_cue` |
| `Goal.achievedAt` (horodatage) | `achieved_on` (date) |
| (absent du domaine) `Goal.domain` | `domain` (obligatoire, `autre` par défaut) |
| (à ajouter au domaine) `Marker.aggregation` | `aggregation` `sum/avg/last` (`sum` par défaut) |

## 4. Appliquer la migration

En local, avec la CLI Supabase et Docker :

```bash
supabase init            # une seule fois, s'il n'y a pas encore de supabase/config.toml
supabase start           # démarre Postgres + Auth en local
supabase db reset        # recrée la base et applique supabase/migrations/*
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/rls_isolation.sql
supabase db lint         # aucune alerte attendue
supabase gen types typescript --local > /tmp/gen.ts   # pour comparer avec src/lib/db-types.ts
```

Sur un projet distant (plus tard, après validation, en région UE) :

```bash
supabase link --project-ref <ref>
supabase db push
```

Après l'application, lancer les « Advisors » (sécurité et performance) dans le tableau de bord Supabase : ils ne doivent signaler ni table sans RLS ni fonction avec un `search_path` modifiable.

Côté app :

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db-types';
const supabase = createClient<Database>(url, anonKey);
await supabase.rpc('export_my_data');      // export RGPD
// Suppression : Server Action côté serveur → admin.auth.admin.deleteUser(user.id)
```

## 5. Validation faite

La migration a été appliquée sur PostgreSQL 16, avec un faux schéma `auth` (`auth.users` et `auth.uid()` lu dans `request.jwt.claim.sub`) et les rôles `anon` et `authenticated`. Elle passe en une seule transaction. `supabase/tests/rls_isolation.sql` se termine par « rls_isolation : OK ». Scénario testé :

- l'inscription crée le profil, avec `display_name` repris des métadonnées ;
- une utilisatrice A crée objectif, cycle, action, coche, repère, mesure, bilan, analyse, pourquoi, cause, leçon et recette ;
- les CHECK refusent un `week_start` qui n'est pas un lundi, un jour 8 et un 6e pourquoi ;
- un utilisateur B ne voit aucune ligne de A, ne peut rien modifier ni supprimer chez A, et ne peut pas insérer un `user_id` qui n'est pas le sien (RLS) ;
- B ne peut pas rattacher un cycle ou une leçon à l'objectif de A (clé composite) ;
- si A supprime son objectif, tout ce qui en dépend part en cascade, et sa leçon reste avec `goal_id` à NULL ;
- le trigger `updated_at` fonctionne ;
- `anon` reçoit « permission denied » ;
- B ne peut pas appeler `private.delete_user_account` ;
- `private.delete_user_account()` efface A et toutes ses données, et rien chez B ;
- les CHECK de longueur refusent un titre de 121 caractères, une unité de 21, une recette de plus de 2 000 caractères et une valeur `aggregation` inconnue ;
- le trigger `updated_at`, placé dans `private`, fonctionne quand c'est `authenticated` qui fait l'UPDATE ;
- `export_my_data()` renvoie les 14 clés attendues.

`db-types.ts` passe `tsc --strict` avec `createClient<Database>()` de la version installée de supabase-js. Le contrôle couvre `insert`, `select` avec jointure, `rpc`, et le refus d'un domaine invalide.
