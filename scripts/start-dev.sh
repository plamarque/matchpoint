#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d node_modules ]]; then
  echo "Installation des dépendances..."
  npm install
fi

# Arrêt propre des processus en arrière-plan à la sortie
cleanup() {
  [[ -n $WS_PID ]] && kill "$WS_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "Démarrage du serveur WebSocket (télécommande smartphone, port 8765)..."
node server/ws-server.js 8765 &
WS_PID=$!
sleep 0.5

echo "Démarrage du serveur de développement Vite (écoute sur le réseau local)..."
echo ""
echo "  → Affichage : http://localhost:5173/ (ou http://<IP>:5173/ depuis le téléphone)"
echo "  → Contrôle à distance : bouton QR en bas à droite, puis scannez avec le téléphone (même Wi‑Fi)."
echo ""
npm run dev
