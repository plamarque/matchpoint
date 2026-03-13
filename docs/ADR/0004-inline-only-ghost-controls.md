# ADR 0004 — Pilotage inline-only avec hotspots fantômes

## Statut

Accepté

## Contexte

Le besoin produit impose une expérience type Gazoo: pilotage directement sur l’écran projeté, sans panneau annexe visible.

## Décision

- Abandonner le panneau de contrôle latéral.
- Adopter une UI unique avec édition inline et hotspots fantômes.
- Conserver le store métier existant; modifier principalement la couche interaction.
- Rendre les contrôles fantômes visibles en permanence (semi-transparents), avec aides au hover.
- Standardiser les interactions:
  - score via boutons latéraux `-` / `+` autour du score;
  - pénalités via 3 pastilles cliquables;
  - chrono impro via paires de flèches verticales (minutes gauche, secondes droite);
  - annonces via barre d’icônes fantômes avec libellé au hover.

## Conséquences

- Opération plus rapide et plus fidèle à Gazoo.
- Exigence forte sur le design des hitboxes, positions et opacités.
- Nécessite des tests E2E centrés sur interactions inline.
