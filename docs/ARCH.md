# Architecture — Matchpoint

## Vue d’ensemble V1

- SPA Vue 3 + TypeScript, store Pinia unique.
- Routes: `/` (affichage), `/control` et `/remote` (app de contrôle mobile, optionnelle).
- Pilotage inline sur l’affichage et, optionnellement, à distance via:
  - `InlineEditableText` (édition in-place)
  - contrôles fantômes inline (boutons semi-transparents intégrés dans les blocs visuels)
  - `HotspotLayer` pour actions globales projet (période, fullscreen, contraste)
- PWA offline/installable via Workbox.
- **Contrôle à distance** : backend WebSocket distant (déployable sur Google Cloud Run). L’affichage se connecte au backend (URL via `VITE_REMOTE_BACKEND_WS_URL`), crée une session et reçoit un code ; le QR code pointe vers `/control?code=`. Le téléphone ouvre l’app (en ligne ou PWA), rejoint la session avec le code et envoie des commandes ; le backend relaie vers l’affichage ; `commandRunner` applique les commandes au store. Sans backend ou sans Internet, la télécommande est indisponible (message générique), le pilotage local reste intact.

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
