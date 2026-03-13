# ADR 0002 — Stack front-end Vue + TypeScript + PWA

## Statut

Accepté

## Contexte

Matchpoint doit être lisible en projection, installable, et utilisable sans internet, sans imposer un backend en V1.

## Décision

Adopter la stack suivante :
- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- vite-plugin-pwa (Workbox)

## Conséquences

- Livraison rapide d’une application client autonome.
- Bonne maintenabilité via types et store central.
- Offline/installabilité gérées nativement par l’outillage PWA.
- La synchronisation multi-appareils est reportée en V2 (adaptateur réseau).

## Alternatives rejetées

- Backend dès V1 : complexité opérationnelle non justifiée pour mono-écran.
- SvelteKit/React : options valides mais non retenues après arbitrage produit.
