# Développement — Matchpoint

## Prérequis

- Node.js 20+
- npm 10+

## Installation

```bash
git clone <url-du-repo>
cd matchpoint
npm install
```

## Commandes

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur dev |
| `npm run build` | Build production |
| `npm run preview` | Prévisualiser le build |
| `npm run test` | Tests unitaires/intégration |
| `npm run test:e2e` | Tests end-to-end Playwright |
| `npm run lint` | Lint |

## Déploiement (GitHub Pages)

Le déploiement est automatique à chaque push sur `main` via le workflow `.github/workflows/deploy-pages.yml`.

**Une fois le dépôt poussé sur GitHub :**

1. **Activer GitHub Pages** : dépôt → Settings → Pages → Build and deployment → Source : **GitHub Actions**.
2. L’URL du site sera : `https://<username>.github.io/matchpoint/`

Si le dépôt ne s’appelle pas `matchpoint`, adapter `BASE_PATH` dans le workflow (et dans les builds locaux pour preview : `BASE_PATH=/nom-repo/ npm run build`).

## PWA (installation)

L'app est une PWA installable. Pour que Chrome (desktop ou Android) propose **Installer** ou **Ajouter à l'écran d'accueil** avec l'icône :

- Tester en **HTTPS** ou en **localhost** (le mode dev ou un build servi en HTTP non localhost peut ne pas afficher le bouton d'installation).
- Après déploiement sur GitHub Pages, ouvrir l'URL du site puis utiliser le menu Chrome (⋮) → « Installer Matchpoint » ou sur Android « Ajouter à l'écran d'accueil ».
- Le manifest inclut les icônes 192×192 et 512×512 requises par Chrome/Android.

## Notes UX V1

- L’application est pilotée inline sur `/` (pas de panneau de contrôle séparé).
- Les interactions opérateur reposent sur hotspots fantômes + édition texte inline.
