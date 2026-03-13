# Architecture — Matchpoint

## Vue d’ensemble V1

- SPA Vue 3 + TypeScript, store Pinia unique.
- Routes: `/` (affichage), `/control` (app de contrôle mobile, optionnelle).
- Pilotage inline sur l’affichage et, optionnellement, à distance via:
  - `InlineEditableText` (édition in-place)
  - contrôles fantômes inline (boutons semi-transparents intégrés dans les blocs visuels)
  - `HotspotLayer` pour actions globales projet (période, fullscreen, contraste)
- PWA offline/installable via Workbox.
- **Contrôle à distance** : serveur WebSocket léger (`npm run server`, port 8765) sur la machine d’affichage ; l’affichage se connecte en `ws://localhost:8765`, reçoit `server_info` (IP, port) et affiche un QR code pointant vers `/control?host=&port=`. Le téléphone ouvre l’app (en ligne ou PWA), se connecte au même serveur et envoie des commandes JSON ; le serveur relaie vers l’affichage ; `commandRunner` applique les commandes au store. Même Wi‑Fi (ou partage de connexion) requis.

## Composants clés

| Composant | Responsabilité |
|----------|----------------|
| **DisplayInline** | Affichage match, édition texte inline et contrôles opérationnels directs |
| **HotspotLayer** | Rendu et dispatch des hotspots globaux superposés |
| **InlineEditableText** | Gestion click-to-edit, commit/rollback clavier |
| **OverlayPanel** | Affichage plein écran des annonces (clic pour fermeture) |
| **Match Store** | Règles métier et état global |
| **Timer Service** | Tick basé timestamp (robuste) |
| **Persistence Service** | Préférences UI locales versionnées |
| **RemoteControlQR** | Bouton discret + modale QR pour ouvrir l’app contrôle sur le téléphone |
| **ControlApp** (`/control`) | UI mobile-first d’envoi de commandes WebSocket (scores, chronos, overlays, etc.) |
| **remote/commandRunner** | Exécution des commandes reçues sur le store (affichage) |

## Décisions structurantes

- Suppression architecture duale control/display.
- Contrôle inline privilégié pour reproduire le principe Gazoo.
- Typographie et surfaces d’interaction dimensionnées pour projection longue distance.
- Contrôles fantômes visibles en permanence mais atténués, avec feedback hover renforcé.
- Modèle pénalités manuel (3 pastilles par équipe), sans automatisme de score.
- Réglage du chrono impro par paires de flèches séparées: minutes à gauche, secondes à droite.
