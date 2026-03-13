# Architecture — Matchpoint

## Vue d’ensemble V1

- SPA Vue 3 + TypeScript, store Pinia unique.
- Une seule route d’exploitation: `/` (`DisplayInline`).
- Pilotage inline-only via:
  - `InlineEditableText` (édition in-place)
  - contrôles fantômes inline (boutons semi-transparents intégrés dans les blocs visuels)
  - `HotspotLayer` pour actions globales projet (période, fullscreen, contraste)
- PWA offline/installable via Workbox.

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

## Décisions structurantes

- Suppression architecture duale control/display.
- Contrôle inline privilégié pour reproduire le principe Gazoo.
- Typographie et surfaces d’interaction dimensionnées pour projection longue distance.
- Contrôles fantômes visibles en permanence mais atténués, avec feedback hover renforcé.
- Modèle pénalités manuel (3 pastilles par équipe), sans automatisme de score.
- Réglage du chrono impro par paires de flèches séparées: minutes à gauche, secondes à droite.
