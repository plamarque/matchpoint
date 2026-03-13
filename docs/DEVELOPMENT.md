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
| `npm run dev` | Serveur Vite seul (pas de backend). |
| **`npm start`** | **Lance tout** : backend télécommande (8080) + Vite. Un seul script pour le dev avec télécommande. |
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

- Créer un `.env` avec `VITE_REMOTE_BACKEND_WS_URL=ws://localhost:8080` (ou `ws://<IP>:8080` pour accès depuis le réseau).
- Lancer **`npm start`** : le script `start-dev.sh` démarre le backend (port 8080) puis Vite ; tout tourne dans le même terminal.

**Test en local sur le réseau (accès par IP, ex. téléphone)** :

Le backend écoute sur toutes les interfaces (`0.0.0.0`). Avec **`npm start`**, backend et Vite sont lancés ensemble. Pour accéder depuis un téléphone sur le même Wi‑Fi :

1. Lancer **`npm start`**. Au démarrage du backend, la console affiche l’URL LAN (ex. `ws://192.168.1.10:8080`).
2. Dans `.env`, mettre **l’IP de la machine** (pas `localhost`) : `VITE_REMOTE_BACKEND_WS_URL=ws://192.168.1.10:8080`, puis relancer `npm start` (les variables VITE sont lues au démarrage de Vite).
3. Sur l’ordi : ouvrir `http://192.168.1.10:5173/`. Sur le téléphone : ouvrir la même URL pour `/control` ou `/remote` ; il se connectera au backend via l’IP.

Si vous changez d’IP (autre réseau), adapter `VITE_REMOTE_BACKEND_WS_URL` dans `.env` et relancer.

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

4. **WebSocket sur Cloud Run** : aucune option à activer pour « exposer » le WebSocket (Cloud Run gère l’upgrade HTTP). En revanche :
   - **Request timeout** : les connexions WebSocket sont des requêtes HTTP longues, limitées par le timeout du service (défaut 5 min, max 60 min). Le `service.yaml` fixe `run.googleapis.com/request-timeout: "3600"` (1 h). À conserver ou à définir au déploiement (`--timeout=3600`).
   - **Ne pas activer HTTP/2 de bout en bout** : en cas d’activation d’HTTP/2 sur le service, les WebSockets peuvent ne pas fonctionner correctement ; laisser le défaut (HTTP/1.1 pour l’upgrade WebSocket).
   - **Session affinity** (optionnel) : peut aider les reconnexions à tomber sur la même instance ; best-effort uniquement.
   - En CLI : `gcloud run deploy matchpoint-remote --source . --region REGION --allow-unauthenticated --timeout=3600`

### Limites V1

- **Sessions en mémoire** : un redémarrage du backend (ou une nouvelle instance) supprime toutes les sessions. Une seule instance Cloud Run simplifie le modèle ; si plusieurs instances sont utilisées, les sessions ne sont pas partagées.
- **Une télécommande par session** : si un second téléphone rejoint avec le même code, il remplace le premier.
- Pas de base de données ; pas d’authentification au‑delà du code de session.

## Notes UX V1

- L’application est pilotée inline sur `/` (pas de panneau de contrôle séparé).
- Les interactions opérateur reposent sur hotspots fantômes + édition texte inline.
- Un contrôle à distance optionnel est disponible via `/control` ou `/remote` (QR code sur l’affichage lorsque le backend est disponible).
