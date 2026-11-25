# Cap

Web app installable (PWA, mobile d'abord) qui aide à atteindre ses objectifs de vie, semaine après semaine.
Concept et décisions : [`docs/00-brief.md`](docs/00-brief.md).

## Prérequis

- Node.js 22 ou plus récent, npm 10

## Lancer

```bash
npm install
npm run dev        # http://localhost:3000
```

Sans configuration, l'app tourne **entièrement en local** : les données restent dans le `localStorage` du navigateur.

### Activer Supabase (optionnel)

```bash
cp .env.example .env.local
# puis renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Dès que les deux variables sont présentes, `getRepository()` bascule sur l'implémentation Supabase.

## Scripts

| Script          | Rôle                                                        |
| --------------- | ----------------------------------------------------------- |
| `npm run dev`   | serveur de développement                                    |
| `npm run build` | build de production (vérifie aussi les types)               |
| `npm start`     | sert le build de production                                 |
| `npm run lint`  | ESLint (config Next.js)                                     |
| `npm test`      | tests unitaires `src/**/*.test.ts` (node:test, sans bundler) |
| `npm run icons` | régénère les icônes PWA dans `public/icons/`                |

Les tests tournent avec `node --experimental-strip-types` : dans les fichiers testés, importer les modules
relatifs **avec l'extension `.ts`** et éviter les syntaxes TypeScript non effaçables (`enum`, propriétés de constructeur).

## Structure

```
src/
  app/                  layout (lang="fr", colonne mobile max-w-md), accueil, manifest PWA
  components/           composants partagés (enregistrement du service worker)
  lib/
    repo/               couche d'accès aux données : interface Repository + implémentations
                        LocalRepository (localStorage versionné) et SupabaseRepository
    supabase/           clients navigateur et serveur (@supabase/ssr) ; null si env absente
public/
  sw.js                 service worker écrit à la main (actif en production uniquement)
  icons/                icônes PWA (192, 512, maskable, apple-touch)
scripts/                génération des icônes (sharp)
docs/  supabase/        livrables des autres rôles
```

## PWA

- Le service worker n'est enregistré qu'en production (`npm run build && npm start`).
- Cache d'abord pour les assets statiques ; réseau d'abord pour les pages (repli hors ligne) ;
  aucune mise en cache des requêtes hors origine (Supabase), des API ni des requêtes non-GET.
