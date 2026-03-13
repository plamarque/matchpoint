# ADR 0003 — Modèle d’état unique et persistance locale versionnée

## Statut

Accepté

## Contexte

Le pilotage inline exige une source de vérité unique pour synchroniser affichage, édition textuelle et contrôles fantômes. Les préférences doivent survivre aux redémarrages, même hors ligne.

## Décision

- Adopter un **store Pinia unique** (`MatchState`) comme contrat interne v1.
- Implémenter les règles métier (scores, pénalités, périodes, overlays, timers) dans les actions du store.
- Conserver un modèle de pénalités purement manuel (0..3) sans ajout de score automatique.
- Gérer le type d’impro avec un état tri-valeur (`mixte`, `comparee`, `none`) pour autoriser l’affichage vide.
- Persister les préférences/habillages dans un schéma **`StorageSchema v1`** en IndexedDB.
- Prévoir fallback localStorage en cas d’indisponibilité IndexedDB.

## Conséquences

- Cohérence forte entre composants inline et état global.
- Évolution contrôlée via versionnage de schéma.
- Pas d’historique complet en v1 (volontairement hors scope).

## Alternatives rejetées

- État local par composant : risque de divergence entre zones inline.
- LocalStorage seul : capacité et robustesse limitées pour évolution.
