# Workflow documentaire — Matchpoint

## Rôle de ce document

Ce document décrit **quand** mettre à jour **quel** document du dépôt. Il est **normatif** : les contributeurs et les agents doivent le respecter pour garder la cohérence entre la doc et le code.

## Documents normatifs (sources de vérité)

| Document | Quand le mettre à jour |
|----------|------------------------|
| **docs/SPEC.md** | Lorsque le périmètre fonctionnel change (nouvelles capacités, limites, comportement attendu). |
| **docs/DOMAIN.md** | Lorsque des termes, entités ou règles du domaine sont ajoutés ou modifiés. |
| **docs/ARCH.md** | Lorsque la structure, les composants ou la stack technique changent. |
| **docs/ADR/** | À chaque décision d’architecture significative (nouveau fichier `XXXX-titre.md`). |
| **AGENTS.md** (racine) | Lorsque les règles de gouvernance ou le workflow pour les agents changent. |
| **docs/WORKFLOW.md** | Lorsque les règles de mise à jour des docs changent. |

**Règle :** Ne pas contredire ces documents. Le code et les changements doivent s’y aligner.

## Documents de suivi (non normatifs)

| Document | Quand le mettre à jour |
|----------|------------------------|
| **docs/PLAN.md** | Lors des avancées de livraison : statut des tranches, tâches faites / en cours / à faire. Rester factuel. |
| **docs/ISSUES.md** | Lorsqu’un bug est identifié, une limitation constatée, ou qu’un travail est reporté. Pas d’invention ni de spéculation. |

## Document opérationnel

| Document | Quand le mettre à jour |
|----------|------------------------|
| **docs/DEVELOPMENT.md** | Lorsque les étapes d’installation, les commandes (build, dev, test) ou les notes de contribution changent. |

## Ordre recommandé pour les agents

1. **Avant de modifier le comportement ou la structure :** lire SPEC, DOMAIN, ARCH.
2. **Pour savoir quoi faire ensuite :** consulter PLAN.
3. **Pour les problèmes connus :** consulter ISSUES.
4. **Lors d’un changement :** mettre à jour les docs normatifs concernés, puis PLAN/ISSUES/DEVELOPMENT si besoin, en restant factuel pour le suivi.

## Convention d’emplacement

- **AGENTS.md** : racine du dépôt uniquement (requis pour Cursor).
- Tous les autres documents du workflow : **docs/** (SPEC, DOMAIN, ARCH, WORKFLOW, PLAN, ISSUES, DEVELOPMENT).
- ADR : **docs/ADR/** (un fichier par décision, ex. `0001-stack-frontend.md`).
