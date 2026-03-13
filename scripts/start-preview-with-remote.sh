#!/usr/bin/env bash
# Lance le backend de télécommande puis le serveur de prévisualisation du build.
# À utiliser pour tester l’affichage en local avec télécommande smartphone :
#   npm run build && VITE_REMOTE_BACKEND_WS_URL=ws://localhost:8080 npm run build && ./scripts/start-preview-with-remote.sh
# Ou définir VITE_REMOTE_BACKEND_WS_URL dans .env avant le build.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  [[ -n $BACKEND_PID ]] && kill "$BACKEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "Démarrage du backend de télécommande (port 8080)..."
node backend/server.js &
BACKEND_PID=$!
sleep 0.5

echo "Démarrage du serveur de prévisualisation (build)..."
npm run preview
