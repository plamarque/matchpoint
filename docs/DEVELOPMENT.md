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
| `npm run dev` | Serveur Vite (frontend seul). |
| `npm start` | Alias pratique : lance `scripts/start-dev.sh` (Vite seul). |
| `npm run build` | Build production (frontend). |
| `npm run preview` | Prévisualiser le build (Vite seul). |
| `npm run backend` | Backend de télécommande (port 8080) — à lancer en parallèle si vous testez la télécommande en local. |
| `npm run test` | Tests unitaires/intégration |
| `npm run test:e2e` | Tests end-to-end Playwright |
| `npm run lint` | Lint |

## Variables d’environnement (frontend)

Créer un fichier `.env` à la racine (voir `.env.example`) :

- **`VITE_REMOTE_BACKEND_WS_URL`** : URL WebSocket du backend de télécommande. Si vide ou absente, la télécommande est désactivée (le bouton QR affiche « La télécommande n’est pas disponible sans connexion Internet »).
  - En local : `ws://localhost:8080` (avec `npm run backend` dans un autre terminal).
  - En prod : `wss://votre-service-xxx.run.app`
- **`VITE_REMOTE_CONTROL_ORIGIN`** (optionnel) : Origine publique de la PWA pour le lien du QR code. Par défaut = origin + base path au build.

## Déploiement (GitHub Pages)

Le déploiement est automatique à chaque push sur `main` via le workflow `.github/workflows/deploy-pages.yml`.

**Une fois le dépôt poussé sur GitHub :**

1. **Activer GitHub Pages** : dépôt → Settings → Pages → Build and deployment → Source : **GitHub Actions**.
2. L’URL du site sera : `https://<username>.github.io/matchpoint/`

Si le dépôt ne s’appelle pas `matchpoint`, adapter `BASE_PATH` dans le workflow (et dans les builds locaux pour preview : `BASE_PATH=/nom-repo/ npm run build`).

Pour que la télécommande fonctionne avec la PWA déployée, définir `VITE_REMOTE_BACKEND_WS_URL` dans les variables du workflow (ou au build) avec l’URL de votre backend Cloud Run.

## PWA (installation)

L'app est une PWA installable. Pour que Chrome (desktop ou Android) propose **Installer** ou **Ajouter à l'écran d'accueil** avec l’icône :

- Tester en **HTTPS** ou en **localhost** (le mode dev ou un build servi en HTTP non localhost peut ne pas afficher le bouton d'installation).
- Après déploiement sur GitHub Pages, ouvrir l’URL du site puis utiliser le menu Chrome (⋮) → « Installer Matchpoint » ou sur Android « Ajouter à l'écran d'accueil ».
- Le manifest inclut les icônes 192×192 et 512×512 requises par Chrome/Android.

## Contrôle par smartphone (optionnel)

La télécommande repose sur un **backend WebSocket distant** (pas de serveur à lancer sur la machine d’affichage). En l’absence de backend ou d’Internet, un message indique que la télécommande est indisponible ; l’application reste utilisable en pilotage local.

1. **Backend** : déployer le backend (voir ci‑dessous) ou lancer en local `npm run backend` (port 8080).
2. **Frontend** : configurer `VITE_REMOTE_BACKEND_WS_URL` (dans `.env` ou au build) avec l’URL du backend (ex. `ws://localhost:8080` en dev, `wss://xxx.run.app` en prod).
3. Sur l’écran d’affichage : cliquer sur le **bouton QR** (en bas à droite). Si la session distante a été créée avec succès, le **QR code** s’affiche ; sinon : « La télécommande n’est pas disponible sans connexion Internet ».
4. Scannez le QR code avec le téléphone : l’app de contrôle (`/control` ou `/remote`) s’ouvre et rejoint la session.
5. L’app de contrôle permet de piloter scores, chronos, périodes, annonces, etc.

**Test en local (avec backend local)** :

- Terminal 1 : `npm run backend`
- Terminal 2 : créer `.env` avec `VITE_REMOTE_BACKEND_WS_URL=ws://localhost:8080`, puis `npm run dev` (ou `npm run build` puis définir la même variable et `npm run preview` ; ou utiliser `./scripts/start-preview-with-remote.sh` après un build avec cette variable).

## Backend de télécommande (Cloud Run)

Le backend est dans `backend/`. Il gère des sessions temporaires en mémoire (display crée une session, le remote rejoint avec un code).

### Variables d’environnement (backend)

- **`PORT`** : port d’écoute (défaut 8080 ; Cloud Run injecte souvent 8080).
- **`SESSION_TIMEOUT_MS`** : expiration des sessions inactives en ms (défaut 30 min). Voir `backend/.env.example`.

### Lancer en local

À la racine du repo : `npm run backend` (ou depuis `backend/` : `npm install` puis `npm start`).

### Build et déploiement Cloud Run

1. **Depuis le répertoire `backend/`** :

   ```bash
   cd backend
   npm install
   ```

2. **Déploiement avec source** (Google Cloud build l’image à partir du Dockerfile) :

   ```bash
   gcloud run deploy matchpoint-remote --source . --region REGION --allow-unauthenticated
   ```

   Ou build d’image puis déploiement :

   ```bash
   docker build -t gcr.io/VOTRE_PROJECT_ID/matchpoint-remote .
   docker push gcr.io/VOTRE_PROJECT_ID/matchpoint-remote
   gcloud run deploy matchpoint-remote --image gcr.io/VOTRE_PROJECT_ID/matchpoint-remote --region REGION --allow-unauthenticated
   ```

3. Récupérer l’URL du service (ex. `https://matchpoint-remote-xxx-xx.a.run.app`) et utiliser en **WSS** pour la variable frontend : `wss://matchpoint-remote-xxx-xx.a.run.app` (Cloud Run gère HTTP/HTTPS ; les clients WebSocket se connectent en WSS à cette URL).

4. **Timeout** : pour des connexions WebSocket longues, augmenter le timeout de la requête (ex. 3600 s) via l’interface Cloud Run ou le fichier `backend/service.yaml` (annotation `run.googleapis.com/request-timeout`).

### Limites V1

- **Sessions en mémoire** : un redémarrage du backend (ou une nouvelle instance) supprime toutes les sessions. Une seule instance Cloud Run simplifie le modèle ; si plusieurs instances sont utilisées, les sessions ne sont pas partagées.
- **Une télécommande par session** : si un second téléphone rejoint avec le même code, il remplace le premier.
- Pas de base de données ; pas d’authentification au‑delà du code de session.

## Notes UX V1

- L’application est pilotée inline sur `/` (pas de panneau de contrôle séparé).
- Les interactions opérateur reposent sur hotspots fantômes + édition texte inline.
- Un contrôle à distance optionnel est disponible via `/control` ou `/remote` (QR code sur l’affichage lorsque le backend est disponible).
