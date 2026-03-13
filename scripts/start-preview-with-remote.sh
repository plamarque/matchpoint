#!/usr/bin/env bash
# Lance le serveur WebSocket (contrôle à distance) puis le serveur de prévisualisation
# du build. À utiliser quand on veut tester l’affichage en local avec contrôle smartphone
# (npm run build && ./scripts/start-preview-with-remote.sh).
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  [[ -n $WS_PID ]] && kill "$WS_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "Démarrage du serveur WebSocket (contrôle à distance, port 8765)..."
node server/ws-server.js 8765 &
WS_PID=$!

echo "Démarrage du serveur de prévisualisation (build)..."
npm run preview
