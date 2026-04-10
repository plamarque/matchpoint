# Plan — Matchpoint

Suivi de livraison uniquement. Ce document n’est pas une source de vérité comportementale.

## Phase actuelle

V1 inline-only ; évolutions d’affichage alignées sur SPEC/DOMAIN (chrono unique, panneaux score, logos) livrées en tranches 6.x ci-dessous.

## Tranches

| Tranche | Objectif | Statut |
|---------|----------|--------|
| 0 | Bootstrap documentaire | Fait |
| 1 | Stack/front/PWA | Fait |
| 2 | Tableau d’affichage | Fait |
| 3 | Contrôle inline fantôme | Fait |
| 4 | Tests + docs normatives | Fait |
| 5 | Télécommande distante (backend Cloud Run) | Fait |
| 6.1 | Zone chronomètre principale unique (statut → impro vs période) + chrono secondaire compact | Fait |
| 6.2 | Panneaux score type cadran (perspective, scores moins massifs) | Fait |
| 6.3 | Logo équipe optionnel (data URL, persistance, snapshot remote) | Fait |
| 6.4 | Hiérarchie titre / méta en tête ; rappels maillot/carton retirés de l’UI (données carton encore en modèle) | Fait |
| 6.5 | Tests unitaires + doc ARCH ; correctif pause chrono (`pauseTimer` cohérent avec `tickTimer`) | Fait |

## Tâches

- [x] Supprimer panneau de contrôle dédié
- [x] Implémenter édition inline click-to-edit
- [x] Implémenter hotspots fantômes score/pénalités/chronos/couleurs
- [x] Implémenter barre d’annonces fantômes
- [x] Adapter tests unitaires/intégration/e2e
- [x] Mettre à jour SPEC/DOMAIN/ARCH + ADR
- [x] Télécommande : backend WebSocket distant (sessions, QR par code), déploiement Cloud Run
