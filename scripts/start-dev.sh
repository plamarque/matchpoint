#!/usr/bin/env bash
# Lance le backend de télécommande (port 8080) puis le serveur de développement Vite.
# Un seul script pour tout le dev (affichage + télécommande).
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  [[ -n $BACKEND_PID ]] && kill "$BACKEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

if [[ ! -d node_modules ]]; then
  echo "Installation des dépendances..."
  npm install
fi

echo "Démarrage du backend de télécommande (port 8080)..."
node backend/server.js &
BACKEND_PID=$!
sleep 0.5

echo "Démarrage du serveur de développement Vite (écoute sur le réseau local)..."
echo ""
echo "  → Affichage : http://localhost:5173/ (ou http://<IP>:5173/ depuis le réseau)"
echo "  → Télécommande : configurer VITE_REMOTE_BACKEND_WS_URL dans .env (ex. ws://localhost:8080 ou ws://<IP>:8080)."
echo ""
npm run dev
