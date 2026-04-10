# Architecture — Matchpoint

## Vue d’ensemble V1

- SPA Vue 3 + TypeScript, store Pinia unique.
- Routes: `/` (affichage), `/control` et `/remote` (app de contrôle mobile, optionnelle).
- Pilotage inline sur l’affichage et, optionnellement, à distance via:
  - `InlineEditableText` (édition in-place)
  - contrôles fantômes inline (boutons semi-transparents intégrés dans les blocs visuels)
  - `HotspotLayer` pour actions globales projet (période, fullscreen, contraste)
- PWA offline/installable via Workbox.
- **Contrôle à distance (bidirectionnel)** : backend WebSocket distant (déployable sur Google Cloud Run). L’affichage se connecte au backend (URL via `VITE_REMOTE_BACKEND_WS_URL`), crée une session et reçoit un code ; le QR code pointe vers `/control?code=`. Le téléphone ouvre l’app (en ligne ou PWA), rejoint la session avec le code et envoie des commandes ; le backend relaie vers l’affichage ; `commandRunner` applique les commandes au store. L’affichage pousse en outre un snapshot d’état vers le backend (throttlé) ; le backend le stocke et le relaie aux télécommandes connectées. À la connexion d’un remote, le dernier état connu est envoyé. Ainsi, les modifications faites sur l’écran (ordi) ou sur la télécommande se reflètent des deux côtés : deux opérateurs peuvent collaborer en temps réel. Sans backend ou sans Internet, la télécommande est indisponible (message générique), le pilotage local reste intact.

## Composants clés

| Composant | Responsabilité |
|----------|----------------|
| **DisplayInline** | Affichage match, édition texte inline et contrôles opérationnels directs ; centre = un grand cadran (impro ou période) + second cadran compact pour l’autre chrono ; cartes équipe : nom puis zone logo centrée sous le nom (data URL optionnelle, même gabarit gauche/droite ; couleur équipe via le panneau) |
| **HotspotLayer** | Rendu et dispatch des hotspots globaux superposés |
| **InlineEditableText** | Gestion click-to-edit, commit/rollback clavier |
| **OverlayPanel** | Affichage plein écran des annonces (clic pour fermeture) |
| **Match Store** | Règles métier et état global |
| **Timer Service** | Tick basé timestamp (robuste) ; pause sur `startedWithRemainingSeconds` |
| **displayTimer** (`src/services/displayTimer.ts`) | Règle d’affichage : chrono impro « principal » si statut `live` ou `pause`, sinon chrono période (DOMAIN) |
| **Persistence Service** | Préférences UI locales versionnées |
| **RemoteControlQR** | Bouton discret + modale QR pour ouvrir l’app contrôle sur le téléphone |
| **ControlApp** (`/control`) | UI mobile-first : envoi de commandes WebSocket et réception des snapshots d’état pour rester synchronisée avec l’affichage |
| **remote/commandRunner** | Exécution des commandes reçues sur le store (affichage) |

## Décisions structurantes

- Suppression architecture duale control/display.
- Contrôle inline privilégié pour reproduire le principe Gazoo.
- Typographie et surfaces d’interaction dimensionnées pour projection longue distance.
- Contrôles fantômes visibles en permanence mais atténués, avec feedback hover renforcé.
- Modèle pénalités manuel (3 pastilles par équipe), sans automatisme de score.
- Réglage du chrono impro par paires de flèches séparées: minutes à gauche, secondes à droite.
- Équipe : champs optionnels `logoDataUrl` (image inline pour offline) et `voteCardColor` (hex, défauts rouge/blanc gauche/droite, **sans contrôle ni aperçu** sur l’affichage principal) dans `TeamState`, sérialisés avec le match persisté et les snapshots remote.
