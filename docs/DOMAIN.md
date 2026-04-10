# Modèle de domaine — Matchpoint

## Termes clés


| Terme                           | Définition                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inline editing**              | Édition de texte directement sur l’affichage principal.                                                                                                    |
| **Contrôle fantôme**            | Zone interactive semi-transparente en permanence, plus visible au hover.                                                                                   |
| **Hotbar annonces**             | Rangée d’icônes fantômes pour déclencher les overlays et afficher leur label au hover.                                                                     |
| **MatchState**                  | État courant unique du match (source de vérité).                                                                                                           |
| **Type d’impro**                | Valeur affichée à côté de la catégorie: `mixte`, `comparee` ou vide (`none`).                                                                              |
| **Zone chronomètre principale** | Unique emplacement visuel du grand décompte sur l’affichage projeté ; affiche soit le temps impro, soit le temps période selon la phase (voir ci-dessous). |
| **Focale improvisation**        | Contexte où le décompte de l’improvisation en cours est l’information centrale pour le public.                                                             |
| **Focale période / match**      | Contexte où le temps global de période ou de séance est l’information centrale (entracte, vote, etc.).                                                     |


## Phases et contenu de la zone chronomètre

La correspondance entre **statut du match** et le **contenu de la zone chronomètre principale** est la suivante (règle d’affichage ; les deux timers existent toujours côté pilotage).


| Statut du match | Contenu de la zone chronomètre principale                           |
| --------------- | ------------------------------------------------------------------- |
| `live`          | Temps impro                                                         |
| `pause`         | Temps impro                                                         |
| `intermission`  | Temps période                                                       |
| `vote`          | Temps période                                                       |
| `idle`          | Temps période                                                       |
| `ended`         | Temps période (état figé ou dernier affichage utile, selon produit) |


**Note :** si le vocabulaire de statuts évolue, cette table doit être mise à jour pour rester alignée avec la spec fonctionnelle.

## Entités principales

- **MatchState**: statut, période, équipes, impro, timers, overlay, préférences UI.
- **UiPrefs**: inclut opacité idle/hover des contrôles, échelle des hotspots et réglages de lisibilité.
- **HotspotDefinition**: identifiant, label, action, position, dimensions, forme.
- **Équipe (conceptuel)** : outre nom, score, couleur, pénalités — attributs optionnels **logo**, **couleurs de carton de vote** (personnalisation des défauts gauche/droite décrits en spec).

## Règles métier

1. Un seul match actif par instance.
2. Scores et pénalités >= 0.
3. Pénalités plafonnées à 3 par équipe et manipulées manuellement (pas d’effet score automatique).
4. Une seule annonce overlay active à la fois; fermeture manuelle ou auto-expiration.
5. Toutes les actions opérateur passent par inline edit ou contrôles fantômes (pas de panneau dédié).
6. Chrono impro configurable par minutes (pas unité) et secondes (`00`, `10`, `30`, `45`) via flèches dédiées.
7. Période parmi `1`, `2`, `3`, `4`, `premiere`, `derniere`.
8. À l’affichage projeté, **une seule** des deux lectures (impro ou période) occupe la zone chronomètre principale à un instant donné, selon la table *Phases et contenu de la zone chronomètre*.
9. Couleurs de **carton de vote** : défaut **rouge** (équipe côté gauche de l’affichage) et **blanc** (équipe côté droit), **surcharge possible** par configuration par équipe.