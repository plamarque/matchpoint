# Agents

Ce dépôt est gouverné par une documentation normative et des documents de suivi. Les agents (IA et humains) doivent s’y conformer.

## Sources de vérité (normatives)

- **docs/SPEC.md** — Ce que le système fait ; contrat fonctionnel.
- **docs/DOMAIN.md** — Vocabulaire et règles du domaine (impro, matches, scores).
- **docs/ARCH.md** — Structure et technologies.
- **docs/WORKFLOW.md** — Quand mettre à jour quel document.
- **docs/ADR/** — Décisions d’architecture (un fichier par décision).

Ne pas contredire ces documents. Le code et les changements doivent s’y aligner.

## Suivi et opérationnel (non normatifs)

- **docs/PLAN.md** — Livraison : tranches, jalons, statut des tâches. Utiliser pour le suivi, pas pour définir le comportement.
- **docs/ISSUES.md** — Bugs, limitations, travail reporté. Suivi des problèmes uniquement.
- **docs/DEVELOPMENT.md** — Installation, commandes, contribution. Uniquement opérationnel.

## Workflow pour les agents

1. Lire SPEC, DOMAIN et ARCH avant de modifier le comportement ou la structure.
2. Utiliser PLAN pour « quoi faire ensuite » et ISSUES pour « ce qui est cassé ou reporté ».
3. Lors de la mise à jour des docs : modifier les docs normatifs quand le comportement ou la structure change ; garder les docs de suivi factuels.
