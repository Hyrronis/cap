# Brief commun — app « Cap » (nom provisoire)

Source de vérité du concept : doc https://claude.ai/artifact/4DwAigyvLnPWtvYesBoJ7a (résumé ci-dessous).

## Idée
App qui aide chacun à atteindre ses objectifs de vie avec les outils du management de la qualité, **sans jamais dire « qualité »** (pas de « PDCA », « non-conformité », « action corrective », « KPI », « indicateur » dans l'interface). Langue de l'interface : **français**, ton chaleureux, tutoiement, jamais culpabilisant.

## Décisions validées par l'utilisatrice/l'utilisateur
- Web app installable (PWA, mobile d'abord) — pas d'app native pour l'instant.
- Gratuite pour commencer (pas de paiement, pas de paywall).
- Cible : adultes 25-45 ans qui ont déjà lâché des résolutions.

## Boucle centrale (PDCA déguisé), hebdomadaire
1. Viser (objectif clair : SMART + QQOQCCP guidés)
2. Planifier (1 à 3 actions/semaine + 1 à 3 « repères » chiffrés = KPI)
3. Agir (cocher une action, noter un repère en 2 taps)
4. Faire le bilan (3 questions : ce qui a marché, ce qui a bloqué, ce que je change + graphique des repères)
5. Ajuster (modifier le plan) → semaine suivante
- Si un objectif « bloque » 2 semaines de suite → « Creuser la cause » : 5 pourquoi + « tour des causes » (Ishikawa en 5 familles : moi, mon temps, mon environnement, mes moyens, ma méthode) + « ce qui pèse le plus » (Pareto sur les causes notées).
- Objectif atteint → « Ce que j'en retiens » (REX, 3 leçons) + « Ma recette qui marche » (standardisation : routine réutilisable).

## MVP : 6 écrans
1. Créer un objectif guidé  2. Construire le plan  3. Agir au quotidien (aujourd'hui)  4. Bilan de la semaine  5. Creuser un blocage  6. Carnet de leçons et recettes
(+ accueil / liste des objectifs, et auth simple)

## Stack
Next.js (App Router, TypeScript) + Tailwind, PWA ; Supabase (Postgres, Auth, RLS) ; hébergement Vercel ; graphiques Recharts.
**Le prototype doit tourner sans backend** : une couche « repository » avec une implémentation localStorage par défaut, et une implémentation Supabase activée quand `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont définies. Aucun projet Supabase/Vercel n'est créé pour l'instant.
Données sensibles (vie privée) : RGPD, hébergement UE, données isolées par utilisateur (RLS), export et suppression du compte.

## Organisation (6 rôles)
Superviseur (coordination) · Codeur · UI/UX designer · Data ingénieur · Expert base de données · Expert sécurité.
Repo de travail : `/home/user/cap`. Chaque rôle écrit ses livrables dans `docs/` (et `supabase/` pour la base). Ne modifie pas les fichiers d'un autre rôle.
