#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d node_modules ]]; then
  echo "Installation des dépendances..."
  npm install
fi

echo "Démarrage du serveur de développement..."
exec npm run dev
