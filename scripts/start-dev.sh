#!/usr/bin/env bash
# Lance le serveur de développement Vite.
# Pour la télécommande : configurer VITE_REMOTE_BACKEND_WS_URL et lancer le backend
# à part (npm run backend depuis la racine, ou déployer sur Cloud Run).
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d node_modules ]]; then
  echo "Installation des dépendances..."
  npm install
fi

echo "Démarrage du serveur de développement Vite (écoute sur le réseau local)..."
echo ""
echo "  → Affichage : http://localhost:5173/"
echo "  → Télécommande : configurer VITE_REMOTE_BACKEND_WS_URL puis lancer « npm run backend » (ou utiliser un backend déployé)."
echo ""
npm run dev
