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
| **`npm start`** | **Lance l’app avec contrôle à distance** : serveur WebSocket (port 8765) + Vite. À utiliser pour le dev quand le remote est souhaité. |
| `npm run dev` | Serveur Vite seul (pas de serveur WebSocket). |
| `npm run build` | Build production |
| `npm run preview` | Prévisualiser le build (Vite seul) |
| `npm run server` | Serveur WebSocket seul (port 8765) — utile en second terminal si on lance uniquement `npm run dev`. |
| `npm run test` | Tests unitaires/intégration |
| `npm run test:e2e` | Tests end-to-end Playwright |
| `npm run lint` | Lint |

**Contrôle à distance** : une PWA dans le navigateur ne peut pas lancer de processus Node (sécurité). Pour avoir le QR code et le contrôle smartphone, il faut que le serveur WebSocket tourne **avant** d’ouvrir l’app : utilisez **`npm start`** (dev) ou **`./scripts/start-preview-with-remote.sh`** (après `npm run build`) pour lancer serveur + app en une fois.

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

## Contrôle par smartphone (optionnel)

Pour piloter l’affichage depuis un téléphone sans être sur la machine reliée au projecteur :

1. **Même réseau** : connectez l’ordinateur d’affichage et le téléphone au **même Wi‑Fi** (ou partage de connexion du téléphone vers l’ordi).
2. Sur l’ordi : **lancez l’app avec le serveur inclus** pour que le contrôle à distance soit disponible :
   - **Dev** : `npm start` (lance le serveur WebSocket + Vite).
   - **Build local** : `npm run build` puis `./scripts/start-preview-with-remote.sh`.
   - **PWA déployée** (ex. GitHub Pages) : dans un terminal sur la machine d’affichage, lancez `npm run server`, puis ouvrez la PWA dans le navigateur.
3. Sur l’écran d’affichage : cliquez sur le **bouton** (icône téléphone en bas à droite) pour afficher le **QR code** (ou un message invitant à lancer le serveur s’il n’est pas démarré).
4. Scannez le QR code avec le téléphone : l’app de contrôle s’ouvre et se connecte.
5. L’app de contrôle (`/control`) permet de piloter scores, chronos, périodes, annonces, etc.

**Important** : la PWA ne peut pas démarrer le serveur Node elle‑même. Il faut lancer `npm start`, le script de preview avec remote, ou `npm run server` dans un second terminal avant d’ouvrir l’app.

## Notes UX V1

- L’application est pilotée inline sur `/` (pas de panneau de contrôle séparé).
- Les interactions opérateur reposent sur hotspots fantômes + édition texte inline.
- Un contrôle à distance optionnel est disponible via `/control` (QR code sur l’affichage).
