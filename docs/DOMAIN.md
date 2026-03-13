# Modèle de domaine — Matchpoint

## Termes clés

| Terme | Définition |
|-------|------------|
| **Inline editing** | Édition de texte directement sur l’affichage principal. |
| **Contrôle fantôme** | Zone interactive semi-transparente en permanence, plus visible au hover. |
| **Hotbar annonces** | Rangée d’icônes fantômes pour déclencher les overlays et afficher leur label au hover. |
| **MatchState** | État courant unique du match (source de vérité). |
| **Type d’impro** | Valeur affichée à côté de la catégorie: `mixte`, `comparee` ou vide (`none`). |

## Entités principales

- **MatchState**: statut, période, équipes, impro, timers, overlay, préférences UI.
- **UiPrefs**: inclut opacité idle/hover des contrôles, échelle des hotspots et réglages de lisibilité.
- **HotspotDefinition**: identifiant, label, action, position, dimensions, forme.

## Règles métier

1. Un seul match actif par instance.
2. Scores et pénalités >= 0.
3. Pénalités plafonnées à 3 par équipe et manipulées manuellement (pas d’effet score automatique).
4. Une seule annonce overlay active à la fois; fermeture manuelle ou auto-expiration.
5. Toutes les actions opérateur passent par inline edit ou contrôles fantômes (pas de panneau dédié).
6. Chrono impro configurable par minutes (pas unité) et secondes (`00`, `10`, `30`, `45`) via flèches dédiées.
7. Période parmi `1`, `2`, `3`, `4`, `premiere`, `derniere`.
