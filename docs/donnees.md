# Données et calculs — rôle Data ingénieur

Fichiers :

| Fichier | Contenu |
|---|---|
| `src/lib/domain/types.ts` | Types du domaine en camelCase, indépendants de la base (`db-types.ts` de l'expert base de données est la source pour les lignes Postgres ; la conversion snake_case ↔ camelCase se fait dans la couche repository). |
| `src/lib/domain/calculs.ts` | Fonctions pures (aucune dépendance, aucun accès au stockage ni à l'horloge). |
| `src/lib/domain/calculs.test.ts` | 44 tests `node:test`. |
| `src/lib/domain/donnees-demo.ts` | `creerDonneesDemo(ref?)` → `CapData` de démonstration. |

Lancer les tests (Node ≥ 22.6) :

```bash
node --experimental-strip-types --test src/lib/domain/calculs.test.ts
```

Les imports internes portent l'extension `.ts` (exigé par Node). Côté Next.js, cela nécessite `allowImportingTsExtensions: true` dans `tsconfig.json` (déjà présent). Le fichier de test n'est pas vérifié par `tsc` tant que `@types/node` n'est pas installé : c'est attendu, Node l'exécute tel quel.

## 1. Modèle

```
Goal ─┬─ Week (weekStart = lundi) ─┬─ PlannedAction ── ActionLog (1 coche = 1 ligne)
      │                            └─ WeeklyReview (3 réponses + verdict)
      ├─ Marker (repère) ── Measurement
      ├─ RootCauseAnalysis (whys[], causes[{family,label,weight}])
      ├─ Lesson
      └─ Recipe (goalId facultatif : réutilisable)
```

- **Dates civiles** (`IsoDate`, `yyyy-mm-dd`) en **fuseau local** de l'utilisateur. On ne passe jamais par `toISOString()` pour une date civile (ça décale le jour le soir en UTC+x ou le matin en UTC−x). Les horodatages (`createdAt`) restent en ISO UTC complet.
- `Cycle` est un alias de `Week` : un cycle = une semaine de la boucle.
- `WeeklyReview.weekStart` est dénormalisé, ce qui permet aux calculs de se passer de jointure.
- `Marker.baseline` (valeur de départ) est nécessaire pour calculer une progression : il faut le demander lors de la création du repère (« Où en es-tu aujourd'hui ? »).
- `Marker.aggregation` (`'sum' | 'avg' | 'last'`, obligatoire) dit comment regrouper les mesures d'une semaine. Il s'applique partout : graphique, progression et tendance (voir § 2).
- Libellés d'interface des familles de causes : `CAUSE_FAMILY_LABELS` (Moi, Mon temps, Mon environnement, Mes moyens, Ma méthode).

## 2. Calculs et règles

### Début de semaine — `weekStart(date)`
La semaine va du lundi au dimanche (usage français, ISO 8601). Le calcul se fait sur les composantes locales (`new Date(y, m, d - offset)`), donc il n'est pas affecté par les changements d'heure. Les tests sont verts sous Paris, Los Angeles, UTC+14 et UTC−11. Aides fournies : `weekEnd`, `addDays`, `daysBetween`, `isInWeek`, `lastWeekStarts`, `toIsoDate`, `parseIsoDate`, `localDateOf`.

### Taux de réalisation — `actionCompletionRate(actions, logs, weekStart?)`
`rate = Σ min(coches_i, cible_i) / Σ cible_i`, compris entre 0 et 1.
- Chaque action est **plafonnée à sa cible** : courir 5 fois quand 3 sorties étaient prévues ne compense pas un étirement oublié.
- Si `weekStart` est fourni, seules les coches de cette semaine comptent.
- Renvoie aussi `actionsCompleted`, le nombre d'actions dont la cible est entièrement atteinte.
- Rien de prévu → 0. L'interface affiche alors « Pas encore d'action », jamais « 0 % ».

### Agrégation d'un repère — `Marker.aggregation`
Ce champ dit comment regrouper les mesures d'une semaine. On le choisit à la création du repère. Question suggérée : « Quand tu notes plusieurs valeurs dans la semaine, on… les additionne / en fait la moyenne / garde la dernière ? »

| Valeur | Valeur de la semaine | Exemples | Sens de la cible |
|---|---|---|---|
| `sum` | total des mesures | petites dépenses notées au fil de l'eau, km courus, minutes de lecture | **cible hebdomadaire** (ex. ≤ 60 €/semaine) |
| `avg` | moyenne | allure, poids, heures de sommeil, humeur | valeur visée |
| `last` | dernière valeur notée (date, puis heure de saisie) | solde d'un livret, plus longue sortie, niveau atteint | valeur visée |

Un objectif cumulatif sur toute la durée (« Épargner 1 000 € ») se suit avec un repère `last` sur le solde, pas avec `sum` sur les versements : `sum` remet le compteur à zéro chaque semaine.

Les fonctions concernées sont `aggregateValues(mesures, aggregation)`, la primitive commune, puis `markerWeeklySeries`, `markerCurrentValue`, `markerGoalProgress` et `markerTrend`.

### Progression d'un repère — `markerGoalProgress(marker, mesures, ref?)`
1. On calcule la **valeur actuelle** avec `markerCurrentValue`. C'est l'agrégat, selon `aggregation`, de la semaine la plus récente qui a des mesures, jusqu'à la semaine de `ref` incluse. La fonction renvoie aussi `weekStart` et `inProgress`, qui vaut vrai si cette semaine est celle de `ref`. Pour un repère `sum`, le total est alors partiel : l'interface peut afficher « cette semaine, pour l'instant ».
2. On applique **`markerProgress(marker, valeur)`**, la primitive :
   - `up` : `(valeur − départ) / (cible − départ)` ; `down` : `(départ − valeur) / (départ − cible)` ;
   - résultat borné à **0–100**. Une régression affiche 0 et n'est jamais négative (pas de culpabilisation) ;
   - cible égale au départ, ou placée du mauvais côté : 100 si la cible est atteinte, sinon 0. Valeur absente ou NaN : 0.

### Série hebdomadaire — `markerWeeklySeries(marker, mesures, ref, weeks=8)`
Renvoie une entrée par semaine, de la plus ancienne jusqu'à la semaine de `ref`, au format `{ weekStart, value | null, count }`. La valeur est regroupée selon `marker.aggregation`. Une semaine sans mesure vaut `null` : dans Recharts, on garde le trou ou on utilise `connectNulls`, mais on n'invente pas de 0. La fonction générique `weeklySeries(mesures, { ref, weeks, aggregate, markerId })` reste disponible (agrégation par défaut : `avg`).

### Tendance — `markerTrend(marker, mesures, ref, weeks=4, flatRatio=0.01)`
1. On calcule les valeurs hebdomadaires sur N semaines, selon `marker.aggregation`.
2. On calcule la pente par moindres carrés sur les semaines mesurées seulement (x = index de la semaine, ce qui respecte les trous). La pente s'exprime en unité du repère par semaine.
3. **Pour un repère `sum`, la semaine de `ref` n'entre pas dans la pente** : elle est incomplète et ferait croire à une baisse. Elle reste quand même dans `points`, pour le graphique.
4. On interprète la pente :
   - `flat` si `|pente| < 1 % × |cible − départ|` par semaine ;
   - sinon `better` ou `worse` selon la direction du repère ;
   - `unknown` s'il y a moins de 2 semaines prises en compte.

Formulations suggérées : « Ça monte 👍 », « Ça stagne », « Ça recule un peu ». On évite le mot « tendance ».

### Règle « Creuser la cause » — `shouldSuggestDigging(goalId, reviews, analyses?, min=2)`
- On garde un bilan par semaine (le plus récent) et on remonte depuis le dernier.
- On compte les verdicts `stuck` consécutifs. La série s'arrête dès qu'un bilan est `progress` ou qu'une semaine manque (écart ≠ 7 jours).
- `suggest = stuckStreak ≥ 2` **et** aucune analyse de causes n'a été faite pour cet objectif depuis le début de la série bloquée : on ne relance pas l'utilisateur en boucle.
- C'est une **proposition** et jamais une obligation. Formulation suggérée : « Ça coince depuis 2 semaines. On regarde ensemble ce qui bloque ? ».

### Pareto des causes — `paretoCauses(causes, seuil=0.8)` / `paretoFamilies`
1. Les poids ≤ 0 ou non finis sont écartés.
2. Les causes sont triées par poids décroissant. Le tri est stable : à poids égal, l'ordre de saisie est conservé.
3. Pour chaque cause, on calcule `share` (poids ÷ total) et `cumulativeShare`.
4. On sélectionne les causes **jusqu'à celle qui fait franchir ~80 %, incluse**. Une cause dominante (≥ 80 %) peut donc être sélectionnée seule.

`paretoFamilies` applique le même calcul aux sommes de poids par famille, ce qui alimente un graphique « ce qui pèse le plus » par famille. La fonction générique `pareto(entries, weightOf, seuil)` est exportée.

### Série de semaines bouclées — `reviewStreak(reviews, ref)`
Une semaine est « bouclée » si au moins un bilan y a été fait. On compte les semaines consécutives jusqu'à la semaine de `ref`. **La semaine en cours sans bilan ne casse pas la série** : on commence alors à compter à la semaine précédente, ce qui laisse à l'utilisateur le temps de faire son bilan le dimanche. Pour obtenir une série par objectif, on passe les bilans déjà filtrés.

### Clarté SMART — `smartClarity(goal, markerCount=0)`
Chaque critère rempli vaut 20 points (score de 0 à 100). La fonction renvoie `met`, `missing` et `hints` (une question d'aide en tutoiement pour chaque critère manquant).

| Critère | Considéré comme rempli si… |
|---|---|
| specific | `smart.specific` ou le titre fait au moins 3 mots |
| measurable | l'objectif a au moins 1 repère, **ou** `smart.measurable` contient un chiffre |
| achievable | texte non vide |
| relevant | texte non vide |
| timeBound | `deadline` est une date valide postérieure à la création |

Dans l'interface, on montre les **questions manquantes**, pas une note : « Il manque juste une date pour que ce soit clair ».

## 3. Données de démo

`creerDonneesDemo(ref = new Date())` génère des données relatives à `ref`, ce qui garde la démo toujours à jour. `DEMO_REF_DATE` (jeudi 26/11/2026) sert aux tests et aux captures reproductibles. Le jeu contient 4 semaines bilanées (S-4 à S-1) et la semaine en cours entamée.

- **Courir 10 km sans m'arrêter** : 4 bilans « progress ». La plus longue sortie (`last`) passe de 3,5 à 5,5 km, soit 36 % de la cible. L'allure (`avg`, `down`, 2 mesures par semaine) s'améliore. Le jeu contient 1 leçon et 1 recette (« Ma sortie du dimanche »).
- **Épargner 1 000 €** : 2 semaines « progress », puis 2 semaines « stuck » d'affilée (réparation de voiture, dépenses non notées). Le solde du livret (`last`) est à 120 €, soit 12 % de la cible. Les petites dépenses (`sum`, `down`, 2 à 3 notes par semaine, cible ≤ 60 €/semaine) totalisent 95, 88, 130 puis 140 € : la tendance est « worse ». La semaine en cours en est à 23 € pour l'instant. Une analyse a déjà été faite (5 pourquoi, 5 causes pondérées) : le Pareto en retient 3 qui pèsent 80 %. Le plan de la semaine en cours est ajusté en conséquence (virement automatique, enveloppe « imprévus »).

Tous les identifiants commencent par `demo-`, ce qui permet de les purger facilement au premier vrai objectif.

## 4. Métriques produit anonymes (plus tard)

Ces métriques ne collectent **aucune donnée personnelle** : jamais de titre d'objectif, de réponse de bilan, de cause, de montant ni de valeur de repère. Elles ne sont pas nécessaires au MVP. Si on les active :

**Principes**
- Consentement explicite (opt-in) et désactivable dans les réglages. Rien n'est envoyé par défaut.
- On compte des **événements**, sans contenu. Chaque événement contient un nom, la semaine (lundi ISO) et un identifiant d'installation aléatoire, renouvelé à chaque réinitialisation et jamais lié au compte ni à l'e-mail.
- Pas d'IP stockée, pas d'empreinte navigateur, pas de traceur tiers. On utilise un outil hébergé dans l'UE ou une table d'agrégats Supabase.
- Seuil d'affichage minimal : on n'affiche pas un agrégat portant sur moins de 10 installations.
- Conservation des événements bruts limitée (ex. 13 mois), puis on ne garde que les agrégats.

**Événements suffisants**

`goal_created`, `plan_set`, `action_checked`, `marker_noted`, `review_done` (avec `verdict` : progress/stuck), `dig_suggested`, `dig_done`, `goal_achieved`, `recipe_saved`.

**Métriques**

| Métrique | Définition | Pourquoi |
|---|---|---|
| Rétention à 4 semaines | Parmi les installations ayant créé un 1er objectif la semaine S, part qui fait au moins une action ou un bilan pendant la semaine S+4 (cohortes hebdomadaires). | La cible a déjà lâché des résolutions : c'est la métrique n° 1. |
| Taux de bilans faits | Nombre de `review_done` ÷ nombre de semaines-objectif actives (un objectif avec un plan cette semaine-là). | Vérifie que la boucle hebdomadaire tourne réellement. |
| Série médiane | Médiane de `reviewStreak` chez les actifs. | Mesure l'habitude. |
| Conversion « Creuser la cause » | `dig_done` ÷ `dig_suggested`, puis part des objectifs qui repassent en `progress` dans les 2 semaines suivantes. | Vérifie que la proposition aide et n'agace pas. |
| Activation | Part des installations ayant `goal_created` + `plan_set` + 1 `action_checked` dans les 7 jours. | Mesure l'efficacité de l'onboarding. |
| Taux d'atteinte | `goal_achieved` ÷ objectifs créés, par cohorte (à 3 et 6 mois). | C'est la promesse du produit. |

Ces métriques se calculent avec les mêmes briques que l'app (`weekStart`, `reviewStreak`, `daysBetween`) appliquées aux événements, sans jamais lire les données de contenu.
