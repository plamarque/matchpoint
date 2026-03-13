# ADR 0001 — Bootstrap avec gouvernance documentaire

## Statut

Accepté.

## Contexte

Matchpoint est une application tableau d’affichage pour matches d’impro, initiée sans code existant. Il faut poser le périmètre fonctionnel et la structure documentaire avant ou en parallèle des premiers choix techniques.

## Décision

- Mise en place d’un **workflow documentaire gouverné** : SPEC (contrat fonctionnel), DOMAIN (vocabulaire impro), ARCH (structure et stack), WORKFLOW (quand mettre à jour quoi), PLAN et ISSUES (suivi), DEVELOPMENT (opérationnel).
- **AGENTS.md** à la racine pour les agents (dont Cursor) ; tous les autres documents du workflow dans **docs/** ; ADR dans **docs/ADR/**.
- Documentation **prescriptive** en phase bootstrap : SPEC, DOMAIN et ARCH décrivent l’intention (tableau d’affichage, match, équipes, scores, thème, catégorie, chrono) ; les incertitudes sont marquées [ASSUMPTION] / [UNCERTAIN].

## Conséquences

- Les futurs changements de comportement ou d’architecture devront s’aligner sur les docs normatifs et mettre à jour SPEC/DOMAIN/ARCH le cas échéant.
- Le code ne sera pas modifié par le skill de gouvernance documentaire ; la doc précède ou accompagne l’implémentation.
