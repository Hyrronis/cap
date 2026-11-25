# Cap — Spécification UI/UX (MVP)

Auteur : rôle UI/UX designer. Destinataire principal : codeur (Next.js App Router + Tailwind, mobile d'abord).
Référence de largeur : **375 px** (iPhone SE/13 mini). Tout doit fonctionner de 320 px à 430 px ; au-delà de 640 px, le contenu reste centré dans une colonne `max-w-md` (448 px).

---

## 1. Principes et ton

### 1.1 Principes produit
1. **Une chose à la fois.** Un écran = une question ou une action principale. Un seul bouton principal par écran.
2. **2 taps pour agir.** Cocher une action ou noter un repère depuis « Aujourd'hui » ne demande jamais plus de 2 taps.
3. **Jamais de culpabilité.** On ne montre pas de « série perdue », pas de rouge pour un retard, pas de compteur de jours manqués. Un blocage est une information, pas un échec.
4. **Méthode invisible.** Les outils (SMART, QQOQCCP, PDCA, 5 pourquoi, Ishikawa, Pareto, REX, standardisation) structurent les écrans mais ne sont **jamais nommés**.
5. **Le progrès se voit.** Chaque action cochée donne un retour immédiat (animation courte + texte). Le graphique des repères est visible au bilan.
6. **Tout est modifiable.** Un objectif, un plan, une réponse de bilan peuvent être corrigés à tout moment.

### 1.2 Ton (microcopy)
- **Tutoiement** partout. Phrases courtes (≤ 15 mots pour les aides, ≤ 3 mots pour les boutons quand possible).
- Verbes à l'infinitif ou à la 1re personne sur les boutons : « Continuer », « C'est fait », « Je change ça ».
- Écriture inclusive légère au point médian seulement quand inévitable (« seul·e »). Sinon, tournures neutres.
- Émojis : **aucun dans l'interface** (lisibilité, lecteurs d'écran). Les icônes jouent ce rôle.
- Chiffres : format français (`1 234,5`), dates `mardi 3 décembre`, semaines « du 2 au 8 décembre ».

### 1.3 Lexique imposé (mots interdits → mots à utiliser)
| Interdit dans l'UI | À utiliser |
|---|---|
| qualité, PDCA, amélioration continue | (rien — ne pas nommer) |
| KPI, indicateur, métrique | **repère** |
| non-conformité, écart, échec | **blocage**, « ça coince » |
| action corrective / préventive | **ce que je change**, **nouvelle action** |
| analyse des causes, 5 pourquoi, Ishikawa | **Creuser la cause**, **tour des causes** |
| Pareto | **ce qui pèse le plus** |
| REX, retour d'expérience | **Ce que j'en retiens** |
| standard, procédure | **Ma recette qui marche** |
| objectif SMART | **objectif clair** |
| abandonner, échouer, raté | **mettre de côté**, « pas cette fois » |
| en retard, manqué | « pas encore », « il reste… » |

---

## 2. Charte graphique

### 2.1 Palette (tokens CSS)

Définir dans `app/globals.css`. Les valeurs sont des hex ; Tailwind les consomme via `var(--…)`.

| Token (variable CSS) | Usage | Clair | Sombre |
|---|---|---|---|
| `--color-bg` | fond de page | `#FBF8F3` | `#121715` |
| `--color-surface` | cartes, feuilles | `#FFFFFF` | `#1A211E` |
| `--color-surface-muted` | champs, zones secondaires, piste des barres | `#F3EEE6` | `#232B28` |
| `--color-border` | bordures, séparateurs | `#E4DCD0` | `#33403B` |
| `--color-border-strong` | bordure de champ (contraste ≥ 3:1) | `#8C8275` | `#7A8A83` |
| `--color-text` | texte principal | `#1F2A2E` | `#ECEFEA` |
| `--color-text-muted` | texte secondaire, aides | `#5B6670` | `#A9B4AF` |
| `--color-primary` | bouton principal, onglet actif, liens | `#1F6F5C` | `#5CC9A7` |
| `--color-primary-hover` | survol / pressé | `#185A4A` | `#7DD6BA` |
| `--color-on-primary` | texte sur primary | `#FFFFFF` | `#0B1F19` |
| `--color-primary-soft` | fond de puce sélectionnée, bannière douce | `#E3F1EC` | `#173A30` |
| `--color-accent` | repères, célébration, 2e série du graphique | `#B4501A` | `#F0A46B` |
| `--color-on-accent` | texte sur accent | `#FFFFFF` | `#2A1505` |
| `--color-accent-soft` | fond carte « repère » | `#FBEBDF` | `#3A2416` |
| `--color-success` | action cochée, « ça avance » | `#2E7D32` | `#7FD48A` |
| `--color-success-soft` | fond succès | `#E6F4E7` | `#1C3320` |
| `--color-attention` | « ça bloque », bilan à faire (ambre, jamais rouge) | `#8A5A00` | `#F2C46D` |
| `--color-attention-soft` | fond attention | `#FFF4DC` | `#3A2E12` |
| `--color-danger` | **uniquement** suppression définitive | `#B3261E` | `#FF8A80` |
| `--color-on-danger` | texte sur danger | `#FFFFFF` | `#3B0A07` |
| `--color-focus` | anneau de focus | `#1F6F5C` | `#5CC9A7` |
| `--color-chart-grid` | grille du graphique | `#E4DCD0` | `#33403B` |
| `--color-chart-target` | ligne de cible (pointillés) | `#5B6670` | `#A9B4AF` |

**Contrastes vérifiés (WCAG 2.2 AA : 4,5:1 texte, 3:1 composants/grands textes)**
| Paire | Clair | Sombre |
|---|---|---|
| text / bg | ≈ 14,3:1 | ≈ 15,5:1 |
| text-muted / surface | ≈ 5,9:1 | ≈ 8,0:1 |
| text-muted / bg | ≈ 5,5:1 | ≈ 8,5:1 |
| on-primary / primary | ≈ 6,0:1 | ≈ 8,5:1 |
| primary / primary-soft (texte de puce) | ≈ 5,2:1 | ≈ 6,2:1 |
| on-accent / accent | ≈ 5,1:1 | ≈ 8,0:1 |
| success / surface | ≈ 5,1:1 | ≈ 9,6:1 |
| attention / attention-soft | ≈ 5,4:1 | ≈ 7,5:1 |
| on-danger / danger | ≈ 6,5:1 | ≈ 7,0:1 |
| border-strong / surface (bord de champ) | ≈ 3,7:1 | ≈ 4,6:1 |
| focus / bg | ≈ 5,5:1 | ≈ 8,5:1 |

Règle : `--color-border` (décoratif) ne délimite jamais seul un élément interactif ; un champ utilise `--color-border-strong`.

```css
/* app/globals.css */
:root {
  --color-bg:#FBF8F3; --color-surface:#FFFFFF; --color-surface-muted:#F3EEE6;
  --color-border:#E4DCD0; --color-border-strong:#8C8275;
  --color-text:#1F2A2E; --color-text-muted:#5B6670;
  --color-primary:#1F6F5C; --color-primary-hover:#185A4A; --color-on-primary:#FFFFFF; --color-primary-soft:#E3F1EC;
  --color-accent:#B4501A; --color-on-accent:#FFFFFF; --color-accent-soft:#FBEBDF;
  --color-success:#2E7D32; --color-success-soft:#E6F4E7;
  --color-attention:#8A5A00; --color-attention-soft:#FFF4DC;
  --color-danger:#B3261E; --color-on-danger:#FFFFFF;
  --color-focus:#1F6F5C; --color-chart-grid:#E4DCD0; --color-chart-target:#5B6670;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* valeurs sombres */ } }
:root[data-theme="dark"] {
  --color-bg:#121715; --color-surface:#1A211E; --color-surface-muted:#232B28;
  --color-border:#33403B; --color-border-strong:#7A8A83;
  --color-text:#ECEFEA; --color-text-muted:#A9B4AF;
  --color-primary:#5CC9A7; --color-primary-hover:#7DD6BA; --color-on-primary:#0B1F19; --color-primary-soft:#173A30;
  --color-accent:#F0A46B; --color-on-accent:#2A1505; --color-accent-soft:#3A2416;
  --color-success:#7FD48A; --color-success-soft:#1C3320;
  --color-attention:#F2C46D; --color-attention-soft:#3A2E12;
  --color-danger:#FF8A80; --color-on-danger:#3B0A07;
  --color-focus:#5CC9A7; --color-chart-grid:#33403B; --color-chart-target:#A9B4AF;
  color-scheme: dark;
}
body { background: var(--color-bg); color: var(--color-text); }
```
(Dupliquer le bloc sombre dans la media query — Tailwind ou un `@layer` peut factoriser.) Le thème est piloté par `data-theme` sur `<html>` : `"light"`, `"dark"` ou absent (= système). Réglage dans `/reglages`.

**Tailwind** (`tailwind.config.ts` → `theme.extend.colors`) : `bg: 'var(--color-bg)'`, `surface: { DEFAULT: 'var(--color-surface)', muted: 'var(--color-surface-muted)' }`, `border: { DEFAULT: 'var(--color-border)', strong: 'var(--color-border-strong)' }`, `ink: { DEFAULT: 'var(--color-text)', muted: 'var(--color-text-muted)' }`, `primary: { DEFAULT, hover, on, soft }`, `accent: { DEFAULT, on, soft }`, `success: { DEFAULT, soft }`, `attention: { DEFAULT, soft }`, `danger: { DEFAULT, on }`, `focus`. Exemple : `bg-primary text-primary-on`.

### 2.2 Typographie
- Police : **Nunito** (Google Fonts, via `next/font/google`, `subsets: ['latin']`, `weight: ['400','600','700','800']`, `display: 'swap'`, variable `--font-sans`). Repli : `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Chiffres des repères : `font-variant-numeric: tabular-nums` (classe `tabular-nums`).
- Taille minimale du texte : 14 px (sauf légendes de graphique 12 px). Les champs de saisie sont en **16 px** (évite le zoom iOS).

| Token | Taille / interligne | Graisse | Usage |
|---|---|---|---|
| `text-display` | 28 / 34 px | 800 | question de l'assistant, célébration |
| `text-title` | 22 / 28 px | 700 | titre d'écran (h1) |
| `text-heading` | 18 / 24 px | 700 | titre de section, de carte (h2/h3) |
| `text-body` | 16 / 24 px | 400 | texte courant, champs |
| `text-body-strong` | 16 / 24 px | 600 | libellés, boutons |
| `text-small` | 14 / 20 px | 400 | aides, méta |
| `text-caption` | 12 / 16 px | 600 | légendes graphique, badges |
| `text-number` | 32 / 36 px | 800, tabular | valeur d'un repère |

### 2.3 Rayons, espacements, ombres, mouvement
- **Rayons** : `--radius-sm: 8px` (puces, badges) · `--radius-md: 12px` (champs, boutons) · `--radius-lg: 16px` (cartes) · `--radius-xl: 24px` (feuilles du bas, haut seulement) · `--radius-full: 9999px` (cases à cocher rondes, avatars).
- **Espacements** (base 4 px, échelle Tailwind) : 4, 8, 12, 16, 20, 24, 32, 40, 48. Marge latérale de page **16 px** (`px-4`). Écart entre cartes 12 px (`gap-3`). Padding de carte 16 px. Espace entre sections 24 px (`space-y-6`).
- **Ombres** (clair ; en sombre, remplacer par une bordure `--color-border` et pas d'ombre) :
  - `--shadow-sm: 0 1px 2px rgba(31,42,46,.06), 0 1px 3px rgba(31,42,46,.08)` (cartes)
  - `--shadow-md: 0 4px 12px rgba(31,42,46,.10)` (bouton flottant, toast)
  - `--shadow-lg: 0 -8px 24px rgba(31,42,46,.12)` (feuille du bas)
- **Mouvement** : durées 150 ms (état), 250 ms (feuille, page), 400 ms (célébration). Courbe `cubic-bezier(.2,.8,.2,1)`. Sous `prefers-reduced-motion: reduce` : pas de translation ni d'échelle, seulement fondu ≤ 150 ms.
- **Hauteurs** : bouton 48 px (`h-12`), bouton secondaire compact 44 px, champ 48 px, barre d'onglets 64 px + `env(safe-area-inset-bottom)`, en-tête 56 px.

### 2.4 Icônes
`lucide-react` (trait 2 px, taille 24 px, 20 px dans les puces). Icônes décoratives : `aria-hidden="true"`. Icônes seules dans un bouton : `aria-label` obligatoire.

---

## 3. Navigation et routes

### 3.1 Barre d'onglets (bas d'écran)
Fixe en bas, fond `surface`, bordure haute `border`, 4 onglets de largeur égale, icône 24 px + libellé 12 px, cible ≥ 44×44 px. Onglet actif : couleur `primary`, libellé 600, indicateur barre 3 px au-dessus de l'icône. `aria-current="page"` sur l'actif.

| Onglet | Icône lucide | Route | Badge |
|---|---|---|---|
| Aujourd'hui | `Sun` | `/` | — |
| Objectifs | `Target` | `/objectifs` | — |
| Bilan | `CalendarCheck` | `/bilan` | point ambre si ≥ 1 bilan à faire (`aria-label="Bilan, 1 bilan à faire"`) |
| Carnet | `BookOpen` | `/carnet` | — |

La barre est **masquée** dans les parcours pas à pas (assistant objectif, bilan en cours, creuser, retenir, onboarding, connexion) : ces écrans ont un en-tête avec bouton « Fermer » (`X`) et une barre de progression.

Accès aux réglages : icône `Settings` (`aria-label="Réglages"`) en haut à droite de l'écran Aujourd'hui et de l'écran Objectifs.

### 3.2 Routes Next.js (App Router)
| Route | Écran | Barre d'onglets |
|---|---|---|
| `/bienvenue` | Onboarding (3 écrans, `?etape=1..3`) | non |
| `/connexion` | Connexion / continuer sans compte | non |
| `/` | Aujourd'hui | oui |
| `/objectifs` | Liste des objectifs | oui |
| `/objectifs/nouveau` | Assistant objectif (`?etape=1..8`) | non |
| `/objectifs/[id]` | Détail d'un objectif | oui |
| `/objectifs/[id]/modifier` | Assistant objectif prérempli | non |
| `/objectifs/[id]/plan` | Construire / ajuster le plan | non (en-tête retour) |
| `/bilan` | Liste des bilans de la semaine | oui |
| `/bilan/[id]` | Bilan d'un objectif (`?etape=1..5`) | non |
| `/objectifs/[id]/creuser` | Creuser la cause (`?etape=…`) | non |
| `/objectifs/[id]/retenir` | Ce que j'en retiens + Ma recette | non |
| `/carnet` | Carnet (`?vue=lecons|recettes`) | oui |
| `/carnet/recettes/[id]` | Détail d'une recette | oui |
| `/reglages` | Réglages, export, suppression | oui |

Les étapes sont dans l'URL (`?etape=`) pour que le bouton retour du navigateur fonctionne et que l'état survive au rechargement. Les brouillons d'assistant sont sauvegardés à chaque étape (repository local) : en revenant, on propose « Reprendre là où tu t'étais arrêté ? ».

Garde de route : premier lancement → `/bienvenue`. Après onboarding → `/connexion`. Mode sans compte accepté (local) → `/`.

### 3.3 Gabarit commun d'un écran à onglets
```
┌ En-tête 56px : titre h1 (gauche) · action icône (droite)
│ Contenu : px-4, pt-2, pb-[calc(64px+safe-area+16px)]
└ Barre d'onglets 64px fixe
```
Gabarit pas à pas :
```
┌ En-tête : [← Retour] (si étape > 1) · Barre de progression · [X Fermer]
│ Libellé étape « 2 sur 8 » (text-caption, muted)
│ Question (text-display) + aide (text-small, muted)
│ Champ(s)
└ Pied collant : bouton principal pleine largeur (+ lien secondaire au-dessus)
```
« Fermer » pendant un parcours ouvre la feuille de confirmation : titre « Tu t'arrêtes là ? », texte « Ce que tu as écrit est gardé. Tu pourras reprendre plus tard. », boutons « Reprendre » (principal) et « Quitter » (secondaire).

---

## 4. Écrans du MVP

Conventions : **[P]** bouton principal, **[S]** secondaire, **[L]** lien/tertiaire. `{…}` = variable. Les textes entre guillemets sont exacts.

### 4.1 Aujourd'hui — `/`
**But** : agir en 2 taps (cocher une action, noter un repère) et voir s'il y a un bilan à faire.

**Structure (haut → bas)**
1. En-tête : salutation h1 selon l'heure — 5 h-12 h « Bonjour {prénom} », 12 h-18 h « Bon après-midi {prénom} », 18 h-5 h « Bonsoir {prénom} » (sans prénom : « Bonjour », etc.). Sous-titre `text-small muted` : « {jour date} · semaine du {lundi} au {dimanche} ». Icône Réglages à droite.
2. **Bannière bilan** (si bilan dû : on est dimanche/lundi ou le jour de bilan choisi, et bilan non fait) — composant `Banner` variante `attention` :
   - Titre : « C'est l'heure de ton bilan »
   - Texte : « 5 minutes pour voir où tu en es et ajuster ta semaine. »
   - [P compact] « Faire mon bilan » → `/bilan`. [L] « Plus tard » (masque jusqu'au lendemain).
3. Pour chaque objectif actif, une `GoalTodayCard` :
   - Titre court de l'objectif (h2) + `ProgressRing` « {faites}/{prévues} cette semaine ».
   - Liste des actions de la semaine (`ActionCheckItem`) : case ronde 28 px dans une cible 44 px, libellé, fréquence « {n} sur {total} cette semaine ». Tap sur la ligne = cocher **une occurrence pour aujourd'hui** (1 tap). Re-tap = annuler (avec toast « Action décochée »).
   - Rangée de repères (`MetricChip`) : nom + dernière valeur + unité (« Pas : 6 200 »). Tap → feuille `MetricEntrySheet` préremplie avec la dernière valeur → [P] « Enregistrer » (2e tap).
4. [S pleine largeur, icône `Plus`] « Nouvel objectif » (si < 3 objectifs actifs).

**Retours**
- Action cochée : la case se remplit `success` avec coche animée (250 ms), libellé non barré (lisibilité), texte « Fait » à droite. Toast : variations tournantes « Bien joué. », « Une de plus. », « C'est noté, bravo. ». Quand toutes les actions de la semaine d'un objectif sont faites : toast « Tout ce que tu avais prévu cette semaine est fait. Chapeau. »
- Repère enregistré : toast « Repère noté : {valeur} {unité}. »

**États**
- **Vide (aucun objectif)** : illustration simple (icône `Compass` 48 px dans un cercle `primary-soft`), titre « Par quoi tu veux commencer ? », texte « Un objectif, quelques petites actions par semaine, et on fait le point ensemble chaque semaine. », [P] « Créer mon premier objectif » → `/objectifs/nouveau`.
- **Objectif sans plan** : dans la carte, texte « Il manque ton plan de la semaine. », [S compact] « Faire mon plan » → `/objectifs/[id]/plan`.
- **Rien de prévu aujourd'hui / tout fait** : texte dans la carte « Rien d'autre aujourd'hui. Profite. »
- **Chargement** : 2 `Skeleton` de carte (hauteur 160 px), `aria-busy="true"` sur la liste.
- **Erreur de chargement** : `ErrorState` « On n'arrive pas à afficher ta journée. » + [S] « Réessayer ».
- **Erreur d'enregistrement** (coche ou repère) : on annule l'état optimiste, toast `attention` « Ce n'est pas enregistré. Vérifie ta connexion et réessaie. » avec action « Réessayer ».
- **Hors ligne** (mode Supabase) : bandeau fin en haut « Tu es hors ligne. Tes changements seront envoyés au retour du réseau. »

### 4.2 Objectifs — `/objectifs`
**But** : voir tous ses objectifs et en créer un.

**Structure**
1. En-tête h1 « Mes objectifs » + icône Réglages.
2. `SegmentedControl` : « En cours » (défaut) · « Atteints » · « De côté ».
3. Liste de `GoalCard` : titre, échéance « Pour le {date} » ou « Il reste {n} semaines », `StatusBadge` (« Ça avance » success / « Ça bloque » attention / « Pas encore de bilan » neutre), mini-barre de progression du repère principal « {valeur} / {cible} {unité} ». Tap → `/objectifs/[id]`.
4. [P] « Nouvel objectif » (pied collant au-dessus de la barre d'onglets). Si 3 objectifs en cours : le bouton reste actif mais ouvre d'abord la feuille : titre « Tu as déjà 3 objectifs en cours », texte « C'est beaucoup à mener de front. Tu peux en mettre un de côté, ou te lancer quand même. », [P] « Continuer quand même », [S] « Voir mes objectifs ».

**États vides**
- En cours : « Aucun objectif en cours. » + [P] « Créer un objectif ».
- Atteints : « Tes objectifs atteints apparaîtront ici. Le premier arrive. »
- De côté : « Rien de mis de côté. »
- Chargement / erreur : idem 4.1 (« On n'arrive pas à afficher tes objectifs. »).

### 4.3 Assistant « Créer un objectif » — `/objectifs/nouveau?etape=1..8`
**But** : transformer une envie floue en objectif clair (SMART + QQOQCCP invisibles), une question par écran.

Commun à toutes les étapes : gabarit pas à pas (3.3), barre de progression `{n}/8`, bouton [P] « Continuer » désactivé tant que le champ requis est vide (et texte d'aide `aria-describedby` sous le bouton : « Réponds pour continuer. »). Le clavier ne masque pas le bouton (pied collant au-dessus du clavier via `visualViewport`). Les puces d'exemples remplissent le champ (modifiable ensuite).

| Étape | Méthode (interne) | Question (`text-display`) | Aide | Champ | Exemples (puces) | Validation |
|---|---|---|---|---|---|---|
| 1 | Quoi / Spécifique | « Qu'est-ce que tu veux atteindre ? » | « Dis-le avec tes mots. On le rendra plus précis ensemble. » | textarea 3 lignes, max 120 car., placeholder « Ex. : courir 10 km sans m'arrêter » | « Courir 10 km » · « Lire 12 livres cette année » · « Économiser 1 000 € » · « Dormir avant 23 h » | requis, ≥ 3 car. |
| 2 | Pourquoi / Pertinent | « Pourquoi c'est important pour toi ? » | « Ta raison profonde. C'est elle qui te portera les jours sans envie. » | textarea, max 200 | « Me sentir en forme » · « Avoir plus confiance en moi » · « Être serein·e côté argent » · « Avoir plus de temps pour moi » | requis |
| 3 | Combien / Mesurable | « Comment sauras-tu que c'est réussi ? » | « Choisis un chiffre que tu peux vérifier. Ce sera ton repère principal. » | 3 champs : « Ce que tu comptes » (texte, ex. « Distance courue »), « Ton but » (nombre, `inputmode="decimal"`), « Unité » (texte court ou puces « km », « fois », « minutes », « € », « pages ») + `ToggleGroup` « Plus c'est haut, mieux c'est » / « Plus c'est bas, mieux c'est » | — | les 3 requis ; nombre > 0 |
| 4 | Quand / Temporel | « Pour quand ? » | « Une date un peu ambitieuse mais tenable. Tu pourras la changer. » | puces « Dans 1 mois » · « Dans 3 mois » · « Dans 6 mois » · « Choisir une date » (ouvre `<input type="date">`) | — | date future ; si < 2 semaines, aide `attention` : « C'est très proche. Tu es sûr·e ? Tu peux garder cette date. » |
| 5 | Où + Comment | « Comment tu vas t'y prendre, et où ? » | « Une idée suffit, même petite. » | textarea « Comment » (placeholder « Ex. : 3 sorties par semaine, en partant doucement ») + champ court « Où » (placeholder « Ex. : au parc, à la maison ») | Où : « À la maison » · « Dehors » · « Au travail » · « En ligne » | « Comment » requis, « Où » facultatif |
| 6 | Qui | « Avec qui ? » | « Être accompagné·e aide beaucoup. Seul·e, ça marche aussi. » | choix unique `ChoiceCard` : « Seul·e » · « Avec quelqu'un » (révèle champ « Qui ? », facultatif) · « En groupe ou en club » | — | requis |
| 7 | Combien (temps) / Atteignable | « Combien de temps par semaine peux-tu y consacrer ? » | « Sois honnête : mieux vaut peu et tenu que beaucoup et lâché. » | puces choix unique « 30 min » · « 1 h » · « 2 h » · « 3 h ou plus » | — | requis |
| 7b | Réaliste | (même écran, sous le temps) « À quel point ça te semble faisable ? » | — | `RatingScale` 1-5 libellés aux bornes « Pas sûr du tout » / « Tout à fait » | — | requis. Si 1-2 : `Banner info` « Et si on visait un peu plus petit pour commencer ? Réussir une première marche donne de l'élan. » [L] « Modifier mon but » (→ étape 3) |
| 8 | Reformulation | « Voici ton objectif » | « Relis-le. S'il te ressemble, on passe au plan. » | `GoalSummaryCard` (voir ci-dessous) + champ « Un nom court » prérempli (étape 1 tronquée à 40 car.) | — | — |

**Phrase de reformulation (étape 8)** — gabarit, chaque morceau est un lien « modifier » vers son étape (`aria-label="Modifier : {morceau}"`) :
> « D'ici le **{date}**, je veux **{quoi}**. C'est important pour moi parce que **{pourquoi}**. Je saurai que c'est réussi quand **{ce que je compte}** atteindra **{but} {unité}**. Je m'y prends ainsi : **{comment}**{, **{où}**}, **{seul·e | avec {qui} | en groupe}**, avec environ **{temps}** par semaine. »

Boutons étape 8 : [P] « C'est mon objectif » → crée l'objectif → écran de confirmation ; [L] « Modifier » (revient à l'étape 1).

**Confirmation** (plein écran, animation 400 ms) : icône `Flag` dans cercle `primary-soft`, titre « Ton objectif est posé. », texte « Maintenant, choisissons tes premières actions de la semaine. », [P] « Faire mon plan » → `/objectifs/[id]/plan`, [L] « Plus tard » → `/`.

**États** : brouillon retrouvé → feuille « Reprendre là où tu t'étais arrêté ? » [P] « Reprendre » [S] « Recommencer ». Erreur à l'enregistrement → toast « On n'a pas pu enregistrer ton objectif. Réessaie. » (le contenu reste à l'écran). Chargement à l'enregistrement : bouton en état `loading` (« Enregistrement… », `aria-live="polite"`).

### 4.4 Détail d'un objectif — `/objectifs/[id]`
**Structure**
1. En-tête : [← retour] · menu `MoreVertical` (`aria-label="Plus d'options"`) avec « Modifier l'objectif », « Mettre de côté », « J'ai atteint mon objectif », « Supprimer ».
2. Titre h1 + `StatusBadge` + « Pour le {date} · il reste {n} semaines ».
3. `GoalSummaryCard` repliable « Mon objectif en entier ».
4. Section « Mon plan de la semaine » : liste des actions (lecture) + repères ; [S] « Ajuster mon plan » → `/plan`.
5. Section « Mes repères » : `MetricChart` du repère principal (8 dernières semaines).
6. Section « Mes bilans » : liste chronologique de `ReviewItem` (semaine, statut, extrait « Ce que je change »).
7. Si statut « Ça bloque » 2 semaines de suite : `Banner` `attention` « Ça coince depuis 2 semaines. Et si on cherchait pourquoi, ensemble ? » [P compact] « Creuser la cause ».

**Confirmations**
- Mettre de côté : feuille « Mettre cet objectif de côté ? » / « Il ne s'affichera plus dans ta journée. Tu pourras le reprendre quand tu veux. » [P] « Mettre de côté » [S] « Annuler ». Toast « Objectif mis de côté. » + action « Annuler ».
- Atteint : → `/objectifs/[id]/retenir`.
- Supprimer : `ConfirmDialog` danger « Supprimer cet objectif ? » / « Son plan, ses repères et ses bilans seront effacés. On ne pourra pas les récupérer. » [danger] « Supprimer » [S] « Garder ». Toast « Objectif supprimé. »
- Objectif introuvable : `ErrorState` « Cet objectif n'existe plus. » [S] « Voir mes objectifs ».

### 4.5 Construire le plan — `/objectifs/[id]/plan`
**But** : 1 à 3 actions par semaine + 1 à 3 repères chiffrés.

**Structure**
1. En-tête [← retour], h1 « Mon plan de la semaine », sous-titre « Semaine du {lundi} au {dimanche} ».
2. Rappel objectif : ligne `text-small muted` « Pour : {nom de l'objectif} ».
3. **Section « Mes actions »** (h2) + aide « 1 à 3 petites actions. Assez petites pour les faire même un jour moyen. »
   - Liste de `ActionEditor` : champ « Ce que je fais » (placeholder « Ex. : courir 20 minutes »), `Stepper` « Combien de fois cette semaine ? » (1-7, défaut 3), puces jours facultatives « L M M J V S D » (`aria-label` = nom complet du jour), bouton supprimer (`Trash2`, `aria-label="Retirer cette action"`).
   - [L icône `Plus`] « Ajouter une action » (masqué à 3 ; à la place : texte « 3 actions, c'est le bon maximum. »).
   - Suggestions (si 0 action) : 3 puces générées à partir du « comment » de l'étape 5 (texte libre découpé) ou génériques : « Préparer mes affaires la veille », « Bloquer un créneau dans mon agenda », « Commencer par 10 minutes ».
4. **Section « Mes repères »** (h2) + aide « Des chiffres simples à noter, pour voir le chemin parcouru. »
   - Le repère principal (défini à l'étape 3) est en tête, non supprimable (badge « Principal »).
   - `MetricEditor` : « Ce que je note » (ex. « Minutes de sommeil »), « Unité », « Ma cible cette semaine » (facultatif), sens (toggle comme étape 3), « Quand je le note » (`SegmentedControl` « Chaque jour » / « Une fois par semaine »).
   - [L] « Ajouter un repère » (max 3).
5. Pied collant [P] « Valider mon plan ».

**Validation** : au moins 1 action avec texte. Erreur inline sous le champ : « Écris ton action en quelques mots. ». Nombre de repères vide n'est pas une erreur.
**Succès** : toast « Ton plan est prêt. Bonne semaine. » → `/`.
**Mode ajustement** (venant du bilan, `?depuis=bilan`) : bandeau `primary-soft` en haut reprenant la réponse « Ce que je change » : « Tu as dit : “{réponse}” ». Le plan de la semaine passée est prérempli ; bouton [P] « Valider pour la semaine prochaine ».
**Chargement** : skeleton du formulaire. **Erreur d'enregistrement** : toast « Ton plan n'est pas enregistré. Réessaie. »

### 4.6 Bilan de la semaine — `/bilan` puis `/bilan/[id]`
**Hub `/bilan`**
- h1 « Bilan de la semaine », sous-titre « Semaine du {lundi} au {dimanche} ».
- Liste des objectifs actifs : `GoalCard` compacte avec à droite « À faire » (badge attention) ou « Fait » (badge success, coche). Tap → `/bilan/[id]`.
- Vide (aucun objectif) : « Pas encore de bilan à faire. Crée un objectif, et on fera le point ensemble en fin de semaine. » [P] « Créer un objectif ».
- Tous faits : `Banner success` « Tous tes bilans sont faits. Belle régularité. »
- Section « Bilans précédents » : liste par semaine (repliable).

**Parcours `/bilan/[id]?etape=1..5`** (gabarit pas à pas, progression /5)

**Étape 1 — Ta semaine en un coup d'œil** (pas de question)
- Titre « Ta semaine pour “{objectif}” »
- `StatTile` : « Actions faites » `{faites} sur {prévues}` ; texte doux selon taux : ≥ 80 % « Tu as tenu ton plan. » ; 40-79 % « Une bonne partie est faite. » ; < 40 % « Semaine plus compliquée. Ça arrive, on regarde pourquoi. »
- `MetricChart` par repère (onglets si plusieurs, `SegmentedControl` avec noms des repères) : courbe sur 8 semaines max (une valeur par semaine = moyenne des saisies quotidiennes ou somme selon le type : défaut **somme** pour unités « fois/km/minutes/pages/€ », **moyenne** sinon — le codeur expose un champ `aggregation: 'sum' | 'avg' | 'last'`), ligne de cible en pointillés, dernier point mis en valeur.
- Résumé texte du graphique (accessible et visible) : « Cette semaine : {valeur} {unité}. Semaine dernière : {valeur précédente}. » Pas de couleur rouge en cas de baisse.
- Si aucune valeur : « Aucun repère noté cette semaine. Pas grave, tu peux en noter un maintenant. » [L] « Noter un repère » (ouvre `MetricEntrySheet` avec date « dimanche »).
- [P] « Continuer »

**Étape 2** — Question « Qu'est-ce qui a marché cette semaine ? » ; aide « Même un petit truc compte. » ; textarea (facultatif) ; puces « J'ai tenu mes créneaux » · « J'étais motivé·e » · « Quelqu'un m'a aidé » · « C'était plus facile que prévu ». [P] « Continuer », [L] « Passer ».

**Étape 3** — « Qu'est-ce qui a coincé ? » ; aide « Pas de jugement ici. On cherche juste ce qui gêne. » ; textarea facultatif ; puces « Pas eu le temps » · « Fatigue » · « Imprévu » · « Oublié » · « Pas envie » · « Rien, tout s'est bien passé ». [P] « Continuer », [L] « Passer ».

**Étape 4** — « Qu'est-ce que tu changes pour la semaine prochaine ? » ; aide « Une seule chose suffit. Garder le même plan, c'est aussi un choix. » ; textarea ; puces « Je garde le même plan » · « Je fais plus petit » · « Je change de moment » · « Je me fais un rappel ». Requis (une puce suffit).

**Étape 5 — Décision** : question « Pour cet objectif, tu dirais… » ; deux `ChoiceCard` grandes (hauteur 96 px) :
- « Ça avance » (icône `TrendingUp`, accent success) — sous-texte « Je suis sur la bonne voie. »
- « Ça bloque » (icône `PauseCircle`, accent attention) — sous-texte « Je patine, quelque chose me freine. »
[P] « Terminer mon bilan ».

**Fin de bilan** (écran de résultat)
- Si « Ça avance » : titre « Bilan fait. Bravo de prendre ce temps. », texte « Ta semaine prochaine se prépare maintenant. »
- Si « Ça bloque » (1re semaine) : titre « Merci pour ton honnêteté. », texte « Une semaine qui coince, c'est normal. Ajuste ton plan, on refait le point dans 7 jours. »
- Si « Ça bloque » 2e semaine consécutive : titre « Ça coince depuis 2 semaines. », texte « Ce n'est pas un manque de volonté. Il y a sûrement une cause, et on peut la trouver en 10 minutes. » [P] « Creuser la cause » → `/objectifs/[id]/creuser` ; [S] « Juste ajuster mon plan ».
- Boutons standard : [P] « Ajuster mon plan » → `/objectifs/[id]/plan?depuis=bilan` ; [S] « Garder mon plan tel quel » (duplique le plan à la semaine suivante, toast « Même plan, nouvelle semaine. C'est parti. ») ; [L] « Bilan suivant » si d'autres objectifs restent à faire.
- Si repère principal ≥ but : `Banner success` « Ton repère a atteint ton but. Tu as peut-être réussi ! » [L] « J'ai atteint mon objectif » → `/retenir`.

**États** : chargement des données de semaine → skeleton du `StatTile` + graphique ; erreur → « On n'arrive pas à charger ta semaine. » [S] « Réessayer » ; erreur d'enregistrement → toast « Ton bilan n'est pas enregistré. Réessaie. » (réponses conservées). Bilan déjà fait → l'ouvrir en lecture avec [L] « Modifier mes réponses ».

### 4.7 Creuser la cause — `/objectifs/[id]/creuser`
**But** : trouver ce qui bloque vraiment (5 pourquoi → tour des causes en 5 familles → pondération → ce qui pèse le plus) et en tirer une action. Durée annoncée : 10 minutes. Progression en 4 parties affichée par libellé : « 1. Pourquoi » · « 2. Le tour des causes » · « 3. Ce qui pèse le plus » · « 4. Ma prochaine action ».

**Intro** (`?etape=intro`)
- Icône `Search` dans cercle `primary-soft`, titre « Creusons ensemble », texte « Quand ça coince, ce n'est presque jamais une question de volonté. On va chercher ce qui te freine vraiment, en 4 petites étapes. Compte 10 minutes. », [P] « On y va », [L] « Pas maintenant ».

**Partie 1 — Les pourquoi** (`?etape=pourquoi-0..5`)
- Écran 0 : « Qu'est-ce qui coince, en une phrase ? » ; aide « Décris ce qui se passe, pas ce que tu penses de toi. » ; textarea prérempli avec la dernière réponse « Qu'est-ce qui a coincé ? » ; placeholder « Ex. : je ne vais pas courir le soir ». Exemple de reformulation non culpabilisante sous le champ si le texte contient « je suis nul », « flemme », « pas capable » : aide douce « Essaie de décrire le fait : “je ne sors pas courir” plutôt que “je suis nul”. » (simple détection de mots, non bloquante).
- Écrans 1 à 5 : en haut, la réponse précédente dans une bulle citée (`QuoteBubble`) ; question « Pourquoi ? » pour le 1er, puis « Et pourquoi ça ? » ; aide (1er écran seulement) « Réponds simplement. On va creuser 5 fois au maximum. » ; textarea ; indicateur « Pourquoi n° {n} sur 5 » sous forme de 5 points.
- Boutons : [P] « Encore un pourquoi » (écrans 1-4) / « Continuer » (écran 5) ; [L] « Je crois que j'ai trouvé » (dès l'écran 2) → passe à la partie 2.
- Récap fin de partie 1 : titre « Voici ton chemin », liste verticale reliée (`WhyChain`) des réponses, la dernière mise en avant avec étiquette « Cause probable ». Texte « Gardons-la en tête. Maintenant, faisons le tour des autres causes possibles. » [P] « Continuer ».

**Partie 2 — Le tour des causes** (`?etape=famille-1..5`) — un écran par famille, la cause probable de la partie 1 est préclassée (l'utilisateur choisit la famille via une feuille « Dans quelle famille la ranges-tu ? » à l'entrée de la partie 2).

| # | Famille (titre) | Icône | Question | Puces d'exemples (multi-sélection) |
|---|---|---|---|---|
| 1 | « Moi » | `User` | « Qu'est-ce qui, chez toi, peut freiner ? » | « Fatigue » · « Peu d'envie en ce moment » · « Peur de ne pas y arriver » · « Stress » · « Santé » |
| 2 | « Mon temps » | `Clock` | « Côté emploi du temps, qu'est-ce qui gêne ? » | « Journées trop chargées » · « Pas de créneau fixe » · « Imprévus fréquents » · « Mauvais moment de la journée » |
| 3 | « Mon environnement » | `Home` | « Autour de toi, qu'est-ce qui complique les choses ? » | « Entourage peu soutenant » · « Météo » · « Trop de distractions » · « Lieu peu pratique » |
| 4 | « Mes moyens » | `Wallet` | « Te manque-t-il quelque chose ? » | « Matériel » · « Budget » · « Informations » · « Aide de quelqu'un » |
| 5 | « Ma méthode » | `ListChecks` | « Et ta façon de t'y prendre ? » | « Marche trop haute » · « Pas de rappel » · « Pas assez précis » · « Trop d'actions à la fois » |

- Chaque écran : puces + [L icône `Plus`] « Ajouter ma propre cause » (champ inline, max 60 car.). Compteur « {n} cause(s) notée(s) ». Aucune obligation : [P] « Famille suivante » / dernier écran « Voir mes causes » ; [L] « Rien ici ».
- Aide commune en bas : « Coche tout ce qui te parle, même un peu. »
- Si 0 cause au total en fin de partie : message « Tu n'as noté aucune cause. Ce n'est pas grave : ton chemin des pourquoi suffit peut-être. » → saute à la partie 4 avec la cause probable.

**Partie 3 — Ce qui pèse le plus** (`?etape=poids` puis `?etape=resultat`)
- Écran poids : titre « Qu'est-ce qui pèse le plus ? », aide « Pour chaque cause, dis à quel point elle te freine. » Liste de `CauseWeightRow` : libellé + icône famille + `RatingScale` 1-5 compacte (`radiogroup`, libellés aux bornes « Un peu » / « Énormément »). Défaut 3. [P] « Voir le résultat ».
- Écran résultat : titre « Voici ce qui pèse le plus » ; `ParetoChart` : barres horizontales triées décroissant (nom de cause à gauche, poids à droite), les causes qui cumulent ~80 % du poids total (min 1, max 3) en `accent`, les autres en `surface-muted` avec texte muted. Phrase de synthèse : « {k} cause(s) sur {n} pèsent pour {p} % de ton blocage. C'est là qu'agir changera le plus. » (p arrondi à 5 %). Alternative texte : la liste triée est le graphique lui-même (barres en HTML/CSS, pas besoin de Recharts ici) — chaque ligne a `aria-label="{cause} : poids {w} sur 5"`.
- [P] « Choisir mon action ».

**Partie 4 — Ma prochaine action** (`?etape=action`)
- Titre « Que peux-tu faire contre “{cause principale}” ? » ; aide « Une action concrète, faisable cette semaine. » ; sélecteur de la cause visée (puces des causes en accent, la 1re présélectionnée) ; champ « Mon action » ; puces de suggestions selon la famille :
  - Moi : « Commencer par 5 minutes » · « Me récompenser après »
  - Mon temps : « Bloquer un créneau fixe » · « Le faire le matin »
  - Mon environnement : « En parler à un proche » · « Préparer mon espace la veille »
  - Mes moyens : « Lister ce qu'il me manque » · « Demander de l'aide »
  - Ma méthode : « Diviser en plus petit » · « Mettre un rappel »
- [P] « Ajouter à mon plan » → ajoute l'action au plan de la semaine (si déjà 3 actions : feuille « Ton plan a déjà 3 actions. Laquelle remplacer ? » avec liste radio + [P] « Remplacer » [S] « Garder les 4 cette fois »).
- Fin : titre « Bien creusé. », texte « Tu sais maintenant sur quoi agir. On en reparle à ton prochain bilan. » [P] « Voir mon plan ». L'analyse est enregistrée et visible dans `/objectifs/[id]` section « Mes bilans » (élément « Cause creusée le {date} »).

**États** : brouillon repris (feuille standard) ; erreur d'enregistrement → toast « Ton analyse n'est pas enregistrée. Réessaie. »

### 4.8 Ce que j'en retiens + Ma recette — `/objectifs/[id]/retenir`
Déclenché par « J'ai atteint mon objectif ». Aussi proposé (facultatif) quand on met de côté : « Tu veux noter ce que tu en retiens ? » [S] « Oui » [L] « Non merci ».

1. **Célébration** : icône `Trophy` grande dans cercle `accent-soft`, animation (confettis CSS légers, désactivés si reduced-motion), titre « Objectif atteint ! », texte « Tu l'as fait : {nom}. Prends une seconde pour savourer. », [P] « Continuer ».
2. **Ce que j'en retiens** : titre « Ce que j'en retiens », aide « 3 leçons pour la prochaine fois. Une phrase chacune. » ; 3 champs numérotés : « Ce qui m'a le plus aidé », « Ce que je referais autrement », « Ce que je conseillerais à un ami ». Au moins 1 requis. [P] « Continuer ».
3. **Ma recette qui marche** : titre « Ma recette qui marche », aide « Garde ce qui a fonctionné pour le réutiliser plus tard. » ; champ « Nom de la recette » (prérempli « Ma recette : {nom} ») ; liste des actions du dernier plan avec cases à cocher (cochées par défaut) « Ce que je garde » ; champ « Mon meilleur moment » (puces « Le matin » · « Le midi » · « Le soir » · « Le week-end ») ; champ « Mon astuce » (facultatif). [P] « Enregistrer dans mon carnet », [L] « Passer ».
4. Fin : toast « Rangé dans ton carnet. » → `/carnet`.

### 4.9 Carnet — `/carnet`
**But** : retrouver ses leçons et réutiliser ses recettes.
- h1 « Mon carnet », sous-titre « Tout ce que tes objectifs t'ont appris. »
- `SegmentedControl` « Leçons » · « Recettes ».
- **Leçons** : `LessonCard` groupées par objectif (titre objectif + date, 1 à 3 leçons en liste). Recherche simple (`SearchField`, placeholder « Chercher une leçon ») si ≥ 5 cartes.
- **Recettes** : `RecipeCard` (nom, nombre d'actions, meilleur moment). Tap → `/carnet/recettes/[id]` : détail + [P] « Utiliser cette recette » → `/objectifs/nouveau?recette=[id]` (assistant prérempli : étape 5 « comment » + plan prérempli après création) ; [L] « Modifier » ; menu « Supprimer » (confirmation « Supprimer cette recette ? » / « Elle disparaîtra de ton carnet. » [danger] « Supprimer » [S] « Garder »).
- **Vides** : Leçons « Ton carnet se remplira quand tu atteindras un objectif. Chaque leçon notée ici te servira pour la suite. » ; Recettes « Pas encore de recette. Quand quelque chose marche pour toi, tu pourras le garder ici. »
- Chargement : 3 skeletons ; erreur : « On n'arrive pas à ouvrir ton carnet. » [S] « Réessayer ».

### 4.10 Connexion — `/connexion`
- Logo texte « Cap » (h1, `text-display`), accroche « Avance vers ce qui compte, une semaine à la fois. »
- **Si Supabase configuré** : champ e-mail (`type="email"`, `autocomplete="email"`, libellé « Ton e-mail »), [P] « Recevoir mon lien de connexion ». Aide « Pas de mot de passe : on t'envoie un lien par e-mail. »
  - Succès : « Regarde ta boîte mail. On a envoyé un lien à {email}. Il est valable 1 heure. » [L] « Renvoyer le lien » (désactivé 60 s, libellé « Renvoyer dans {s} s ») ; [L] « Changer d'e-mail ».
  - Erreurs : e-mail invalide « Cet e-mail ne semble pas complet. Vérifie-le. » ; réseau « On n'a pas pu envoyer le lien. Réessaie dans un instant. » ; lien expiré (retour de callback) « Ce lien a expiré. Demande-en un nouveau. »
- Séparateur « ou ».
- [S] « Continuer sans compte » + aide « Tes données restent sur ce téléphone. Tu pourras créer un compte plus tard. »
- **Si Supabase non configuré** : seul le bouton [P] « Commencer » (mode local) + même aide.
- Pied : [L] « Comment on protège tes données » (feuille : « Tes objectifs sont privés. Ils sont stockés en Europe, visibles par toi seul·e, et tu peux tout exporter ou tout effacer à tout moment depuis les réglages. »).

### 4.11 Réglages — `/reglages`
Liste groupée (`SettingsRow`, hauteur 56 px) :
- **Mon compte** : « Prénom » (champ, utilisé dans la salutation) ; « E-mail » (lecture) ou en mode local « Créer un compte pour sauvegarder » → `/connexion`.
- **Mon rythme** : « Jour de mon bilan » (sélecteur, défaut « Dimanche ») ; « Début de semaine » (« Lundi » fixe en MVP, affiché en lecture).
- **Affichage** : « Thème » `SegmentedControl` « Clair » · « Sombre » · « Comme mon téléphone ».
- **Mes données** : « Exporter mes données » → télécharge un JSON (toast « Ton fichier est prêt. ») ; « Supprimer mon compte et mes données » (texte `danger`) → `ConfirmDialog` : titre « Tout supprimer ? », texte « Tes objectifs, plans, bilans et ton carnet seront effacés définitivement. Pense à exporter tes données avant. », champ « Écris SUPPRIMER pour confirmer », [danger] « Tout supprimer » (actif seulement si saisie correcte), [S] « Annuler ». Succès → `/bienvenue` + toast « Tes données ont été supprimées. Prends soin de toi. »
- **À propos** : « Revoir la présentation » → `/bienvenue` ; « Version {x.y.z} ».
- « Me déconnecter » (mode compte) → confirmation « Te déconnecter ? » [P] « Me déconnecter » [S] « Annuler ».

---

## 5. Composants réutilisables

Dossier proposé : `components/ui/` (primitives) et `components/cap/` (métier). Toutes les primitives acceptent `className`.

### 5.1 Primitives
| Composant | Variantes / props | Notes |
|---|---|---|
| `Button` | `variant`: `primary` · `secondary` (surface + bordure strong + texte primary) · `ghost` (texte primary, sans fond) · `danger` ; `size`: `md` (48 px) · `sm` (44 px) ; `fullWidth` ; `loading` (spinner + `aria-busy`, texte `loadingLabel`) ; `iconLeft` ; `disabled` | rayon md, `text-body-strong`. Pressé : `scale(.98)` (sauf reduced-motion). |
| `IconButton` | `variant`: `ghost` · `soft` ; `label` (requis → `aria-label`) | 44×44 px min. |
| `LinkButton` | lien `next/link` stylé `ghost` | |
| `TextField` | `label`, `hint`, `error`, `type`, `inputMode`, `maxLength` (affiche compteur « {n}/{max} »), `suffix` (unité) | libellé visible toujours au-dessus ; erreur `role="alert"` + `aria-invalid` + `aria-describedby`. |
| `TextArea` | idem + `rows`, auto-grow jusqu'à 6 lignes | |
| `Chip` | `variant`: `suggestion` (remplit un champ) · `choice` (`aria-pressed`) · `filter` ; `selected` ; `icon` | hauteur 36 px visuels dans cible 44 px. Sélectionnée : fond `primary-soft`, texte et bordure `primary`, icône coche. |
| `ChipGroup` | `mode`: `single` (`role="radiogroup"`) · `multiple` (`role="group"`) | navigation flèches en single. |
| `ChoiceCard` | `icon`, `title`, `description`, `tone`: `neutral`·`success`·`attention` ; `selected` | `role="radio"` dans un `radiogroup`. Sélection : bordure 2 px tone + fond soft. |
| `SegmentedControl` | `options`, `value` | `role="tablist"` si change de vue, sinon `radiogroup`. |
| `ToggleGroup` | 2 options exclusives | alias de SegmentedControl en `radiogroup`. |
| `Stepper` | `min`, `max`, `value`, `label` | boutons − / + 44 px, valeur centrale `aria-live="polite"`. |
| `RatingScale` | `min=1`, `max=5`, `minLabel`, `maxLabel`, `size`: `md` · `compact` | `radiogroup`, chaque point a `aria-label="{n} sur 5"`. |
| `DateField` | puces rapides + `input type="date"` | |
| `Checkbox` (rond) | `checked`, `label`, `tone="success"` | 28 px visuels, cible 44 px. |
| `BottomSheet` | `title`, `description`, `onClose` ; `size`: `auto` · `tall` | `role="dialog"` `aria-modal`, piège de focus, fermeture Échap / glisser / tap fond, focus initial sur le 1er champ ou le titre, retour du focus au déclencheur. |
| `ConfirmDialog` | `tone`: `default` · `danger` ; `confirmLabel`, `cancelLabel`, `requireText` | basé sur BottomSheet ; bouton par défaut focalisé = annuler pour danger. |
| `Toast` | `tone`: `neutral` · `success` · `attention` ; `action` (libellé + callback) ; durée 4 s (6 s si action) | conteneur `aria-live="polite"` (attention : `role="alert"`). Positionné au-dessus de la barre d'onglets. Max 1 visible. |
| `Banner` | `tone`: `info` (primary-soft) · `success` · `attention` ; `title`, `text`, `action`, `dismissible` | |
| `Badge` / `StatusBadge` | `tone`: `neutral`·`success`·`attention`·`primary` ; statuts objectif : « Ça avance », « Ça bloque », « Pas encore de bilan », « Atteint », « De côté » | toujours texte + icône (pas couleur seule). |
| `ProgressBar` | `value`, `max`, `label` | `role="progressbar"` + `aria-valuenow/min/max` + `aria-valuetext="{n} sur {max}"`. |
| `ProgressRing` | idem, 40 px | |
| `StepHeader` | `step`, `total`, `onBack`, `onClose` | libellé « Étape {n} sur {total} » lu par lecteur d'écran. |
| `StickyFooter` | contient le CTA ; suit `visualViewport` | padding `safe-area-inset-bottom`. |
| `Skeleton` | `shape`: `line`·`card`·`chart` | animation pulse désactivée en reduced-motion. |
| `EmptyState` | `icon`, `title`, `text`, `action` | |
| `ErrorState` | `title`, `onRetry` | |
| `TabBar` | 4 items | voir 3.1. `<nav aria-label="Navigation principale">`. |
| `AppHeader` | `title`, `back`, `actions` | |
| `SettingsRow` | `type`: `link`·`value`·`toggle`·`danger` | |
| `SearchField` | `placeholder`, `onChange` | `type="search"`, libellé masqué visuellement. |

### 5.2 Composants métier
| Composant | Variantes | Contenu |
|---|---|---|
| `GoalCard` | `full` · `compact` (bilan) | titre, échéance, StatusBadge, ProgressBar repère principal. |
| `GoalTodayCard` | — | titre, ProgressRing, liste `ActionCheckItem`, rangée `MetricChip`, états « sans plan » / « tout fait ». |
| `GoalSummaryCard` | `editable` (liens par morceau, étape 8) · `readonly` · `collapsible` | phrase de reformulation. |
| `ActionCheckItem` | `state`: `todo` · `doneToday` · `weekComplete` | ligne cliquable entière (`<button role="checkbox" aria-checked>`), « {n} sur {total} cette semaine ». |
| `ActionEditor` | `removable` | champ + Stepper + jours. |
| `MetricChip` | `empty` (« Noter ») · `filled` (dernière valeur) | fond `accent-soft`, texte `text`, valeur `tabular-nums`. |
| `MetricEntrySheet` | `daily` · `weekly` | BottomSheet : titre « Noter : {repère} », grand champ numérique (`text-number`, `inputmode="decimal"`) prérempli, Stepper ±1 (ou ±pas défini), date « Aujourd'hui » modifiable (lien « Changer de jour »), [P] « Enregistrer ». Erreur « Entre un nombre. » |
| `MetricEditor` | `primary` (non supprimable) · `secondary` | nom, unité, cible, sens, fréquence. |
| `MetricChart` | `line` (défaut) · `bar` (si unité « fois ») ; `weeks` (4·8) | Recharts `ResponsiveContainer` hauteur 200 px ; série `--color-primary` trait 2,5 px, points 4 px, dernier point 6 px `--color-accent` ; ligne cible `ReferenceLine` pointillés `--color-chart-target` + libellé « But {n} » ; grille horizontale seule `--color-chart-grid` ; axe X « S-7 … Cette sem. » (12 px) ; tooltip « Semaine du {date} : {valeur} {unité} ». Enveloppe `<figure>` + `<figcaption>` = phrase de synthèse ; `aria-hidden` sur le SVG + tableau `sr-only` des valeurs. |
| `StatTile` | `tone` neutral/success | grand chiffre + libellé + phrase. |
| `ReviewItem` | `advancing` · `blocked` · `rootCause` | semaine, badge, extrait. |
| `QuoteBubble` | — | réponse précédente des pourquoi, fond `surface-muted`, bord gauche 3 px `primary`. |
| `WhyChain` | — | liste ordonnée `<ol>` reliée par trait vertical ; dernier élément étiqueté « Cause probable ». |
| `CauseFamilyStep` | 5 familles (prop `family`: `moi`·`temps`·`environnement`·`moyens`·`methode`) | icône, question, ChipGroup multiple, ajout libre. |
| `CauseWeightRow` | — | libellé + icône famille + RatingScale compacte. |
| `ParetoChart` | — | barres horizontales HTML, `accent` pour le top, phrase de synthèse. |
| `LessonCard` | — | objectif, date, `<ol>` de leçons. |
| `RecipeCard` | `list` · `detail` | nom, actions gardées, moment, astuce, CTA « Utiliser cette recette ». |
| `Celebration` | `goalCreated` · `goalReached` | icône, titre, texte, animation. |
| `OnboardingSlide` | — | illustration (icône composée), titre, texte, pagination. |

---

## 6. Onboarding et accessibilité

### 6.1 Onboarding — `/bienvenue?etape=1..3`
Plein écran, pagination 3 points en bas (`aria-label="Écran {n} sur 3"`), [L] « Passer » en haut à droite (→ `/connexion`), balayage horizontal possible + boutons (jamais balayage seul).

1. Icône `Compass` · Titre « Bienvenue sur Cap » · Texte « Ici, on avance vers ce qui compte pour toi. Sans pression, une semaine à la fois. » · [P] « Suivant »
2. Icône `ListChecks` · Titre « Petit plan, vrais progrès » · Texte « Tu poses un objectif clair, tu choisis 1 à 3 petites actions par semaine, et tu coches. 2 secondes par jour. » · [P] « Suivant »
3. Icône `CalendarCheck` · Titre « Chaque semaine, on fait le point » · Texte « 5 minutes pour voir ce qui marche, ce qui coince, et ajuster. Quand ça bloque, on cherche la cause ensemble. Jamais de reproche. » · [P] « C'est parti » → `/connexion`

Après connexion, le premier écran est l'état vide d'Aujourd'hui (CTA « Créer mon premier objectif »). Pas de tutoriel superposé.

### 6.2 Accessibilité (WCAG 2.2 AA)
- **Cibles** : tout élément interactif ≥ **44×44 px** (padding ou pseudo-élément pour les petites puces/cases). Espacement ≥ 8 px entre cibles adjacentes.
- **Focus** : jamais `outline: none` sans remplacement. Style unique : `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]` (contraste ≥ 3:1 sur tous les fonds). Ordre de tabulation = ordre visuel. À chaque changement d'étape d'un parcours, le focus va sur la question (h1, `tabIndex={-1}`) et le titre de document change (`{Question} · Cap`).
- **Lien d'évitement** « Aller au contenu » en premier élément focalisable.
- **Sémantique** : un seul `h1` par écran ; `<main>`, `<nav>` ; listes en `<ul>/<ol>` ; boutons = `<button>`, navigation = `<a>`.
- **ARIA** : onglet actif `aria-current="page"` ; cases d'action `role="checkbox" aria-checked` et libellé complet « {action}, {n} sur {total} cette semaine » ; puces `aria-pressed` ou radios ; feuilles `role="dialog" aria-modal="true" aria-labelledby` ; toasts dans une région `aria-live="polite"` ; erreurs `role="alert"` reliées par `aria-describedby` ; barres de progression avec `aria-valuetext` ; icônes décoratives `aria-hidden="true"`.
- **Formulaires** : libellé visible pour chaque champ (le placeholder n'est jamais le libellé) ; `autocomplete` pertinent ; champs numériques `inputmode="decimal"` et acceptation de la virgule ; erreurs affichées après sortie du champ ou à la soumission, pas pendant la frappe.
- **Couleur** : aucune information portée par la couleur seule (statuts = texte + icône ; graphique = valeurs en texte). Aucun rouge hors suppression.
- **Graphiques** : `<figure>` + phrase de synthèse visible + tableau `sr-only`. Le `ParetoChart` est en HTML lisible.
- **Mouvement** : respecter `prefers-reduced-motion` (pas de confettis, transitions en fondu). Aucun clignotement.
- **Zoom et texte** : tailles en `rem` ; mise en page tenue à 200 % de zoom et avec la taille de police système agrandie ; pas de texte tronqué sans possibilité de lecture (titres d'objectif sur 2 lignes max puis `line-clamp` avec texte complet dans le détail).
- **Langue** : `<html lang="fr">`.
- **Orientation** : portrait et paysage supportés ; zones sûres iOS (`env(safe-area-inset-*)`).
- **Tests** : passage axe-core (0 violation sérieuse), navigation complète au clavier, VoiceOver iOS et TalkBack sur les parcours Créer objectif / Cocher / Bilan.

---

## Résumé
1. Principes, ton (tutoiement, zéro culpabilité) et lexique imposé qui remplace tout jargon qualité (repère, blocage, creuser la cause, ce qui pèse le plus, recette).
2. Charte complète en tokens CSS clair/sombre (hex, contrastes AA vérifiés), mapping Tailwind, typo Nunito, rayons, espacements, ombres, mouvement.
3. Navigation à 4 onglets (Aujourd'hui, Objectifs, Bilan, Carnet) et 15 routes App Router, étapes dans l'URL, brouillons repris.
4. Spécification écran par écran avec textes exacts et états : Aujourd'hui (2 taps), assistant objectif en 8 étapes + reformulation, plan, bilan 3 questions + graphique + « ça avance / ça bloque », Creuser la cause (5 pourquoi, 5 familles, pondération, ce qui pèse le plus, action), retenir/recette, carnet, connexion, réglages RGPD.
5. Catalogue de ~45 composants (primitives + métier) avec variantes, onboarding en 3 écrans et règles d'accessibilité WCAG 2.2 AA (44 px, focus, ARIA, graphiques accessibles).
