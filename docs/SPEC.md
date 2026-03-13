# Spécification fonctionnelle — Matchpoint

## Objectif

Matchpoint est une application **PWA de tableau d’affichage** pour matches d’improvisation.
La V1 fournit un pilotage **100% inline**: toutes les modifications se font directement sur l’écran projeté via édition in-place et contrôles fantômes.

## Périmètre V1

- Affichage lisible à distance: équipes, scores, thème, catégorie, type, période, chronos.
- Édition inline click-to-edit pour les textes (titre impro, catégorie, noms équipes), sans champ visuel distinct.
- Contrôles fantômes **toujours visibles en semi-transparence**, avec renforcement au hover local.
- 9 annonces overlays fixes type Gazoo, déclenchées depuis une barre d’icônes.
- PWA installable, mode offline après premier chargement.

- **Contrôle à distance (optionnel)** : un bouton discret sur l’affichage ouvre un QR code (affiché seulement si une session distante a été créée avec succès) ; le téléphone peut ouvrir l’app de contrôle (`/control` ou `/remote`) et rejoindre la session via un code pour piloter l’affichage. Pas d’app à installer à l’avance (scan = ouverture en ligne ou PWA déjà installée). En l’absence de backend ou d’Internet, la télécommande est indisponible sans bloquer le reste de l’application.

## Hors périmètre V1

- Panneau de contrôle séparé **sur la même machine** (remplacé par contrôle inline + option contrôle à distance).
- Synchronisation multi-appareils **sans même réseau** (cloud, compte).
- Backend/compte utilisateur/cloud sync.
- Audio, export/import, historique complet.

## Comportements attendus

1. **Inline text editing**
- Clic sur texte éditable => mode édition.
- `Enter` valide, `Escape` annule, blur valide.
- Le rendu en édition reste visuellement intégré (pas d’input encadré apparent).

2. **Hotspots fantômes**
- Grandes zones cliquables pour éviter les erreurs de visée.
- Contrôles visibles en permanence mais atténués; le hover augmente lisibilité/feedback.
- Les labels complets des annonces sont accessibles au hover.

3. **Règles match**
- Scores et pénalités jamais négatifs.
- Pénalités gérées manuellement par 3 pastilles cliquables par équipe (toggle par niveau).
- Aucun ajout automatique de point lié aux pénalités.
- Chrono impro et chrono période indépendants : play/pause/reset chacun de son côté ; les deux peuvent être en cours en même temps.
- Réglage chrono impro:
  - minutes via flèches haut/bas à gauche du compteur;
  - secondes via flèches haut/bas à droite, sur pas `00/10/30/45`.

4. **Annonces**
- Déclenchement depuis barre d’icônes fantômes en haut.
- Une seule annonce active à la fois.
- Fermeture par clic sur l’overlay et auto-expiration après temporisation.

## Critères produit

- Toutes les actions opérateur V1 faisables sans panneau latéral.
- Lisibilité intacte sur projection 1080p/4K.
- Fonctionnement offline pour un match complet après cache initial.
