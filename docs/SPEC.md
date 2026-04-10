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
- **Configuration d’équipe (optionnelle)** : logo par équipe, sans écran obligatoire distinct du flux principal si ce n’est pas requis par le produit.

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
- Chrono impro et chrono période restent **indépendants** pour le pilotage (play/pause/reset, réglages) : l’opérateur peut toujours agir sur chaque logique séparément ; les deux peuvent être actifs en parallèle côté comportement.
- Réglage chrono impro:
  - minutes via flèches haut/bas à gauche du compteur;
  - secondes via flèches haut/bas à droite, sur pas `00/10/30/45`.

4. **Zone chronomètre principale (affichage projeté)**

- Une **seule zone chronomètre** occupe l’emplacement central prévu pour le grand décompte : le public ne voit **pas** deux chronomètres identiques empilés (impro + période) à cet endroit.
- Le **contenu** de cette zone dépend du **contexte de phase** du match (voir [docs/DOMAIN.md](DOMAIN.md), section *Phases et contenu de la zone chronomètre*).
- En résumé : **focale improvisation** (temps d’impro pertinent pour le public) → afficher le **temps impro** ; **focale hors improvisation principale** (entracte, vote, temps global de séance, etc.) → afficher le **temps période** dans la **même** zone.
- Les commandes de réglage et lecture restent disponibles pour les deux logiques de temps selon les règles d’interaction définies en implémentation, sans imposer ici la disposition exacte des contrôles fantômes.

5. **Affichage des scores**

- Les scores restent **lisibles à distance** sur projection (1080p / 4K), mais occupent **moins de place visuelle relative** que sur les premières versions : priorité à la lisibilité du titre, de la catégorie et des informations centrales.
- Les blocs score adoptent une présentation de type **panneau / cadran d’affichage** (skeuomorphisme léger : relief, matière, éventuelle perspective ou inclinaison) pour évoquer un tableau physique plutôt qu’un simple cadre plat.
- Les **pénalités** restent **rattachées** visuellement à chaque panneau équipe (pastilles ou équivalent).

6. **Configuration : logos (optionnel)**

- Lors de la **préparation du match** (configuration avant ou en début de soirée, sans imposer un écran séparé), l’opérateur peut associer **optionnellement** un **logo** à chaque équipe.
- Sans logo, le comportement reste centré sur **nom** et **couleur d’équipe** comme aujourd’hui.
- Le logo apparaît sur l’**affichage principal** dans chaque **panneau équipe**, **centré sous le nom** de la troupe ; une zone dédiée permet d’**ajouter** un logo (fichier image), sans libellé dans la zone (contrôle du même ordre que les autres boutons fantômes) ; **pour le remplacer**, l’opérateur **clique sur l’image** du logo (pas de bouton séparé pour retirer le logo depuis cet écran) ; les deux côtés utilisent la **même** présentation (dimensions de zone équivalentes).
- Une fois renseignés, les logos doivent rester **exploitables en mode offline** pour un match complet (après chargement initial), sans préciser ici le mécanisme de stockage.

7. **Hiérarchie visuelle et repères équipe**

- Les **lignes d’information centrales** (type d’impro, titre, catégorie, durée annoncée, etc.) utilisent une **hiérarchie visuelle claire** : couleurs ou styles distincts pour que le spectateur distingue immédiatement le **titre** des **métadonnées**, sans imposer de palette figée dans cette spec.
- Sur l’**affichage principal**, le **repère couleur équipe** pour le public repose sur la **couleur du panneau score** (et le **logo** si présent) ; **pas** de pictogramme maillot ni d’aperçu couleur de carton de vote à l’écran.

8. **Annonces**
- Déclenchement depuis barre d’icônes fantômes en haut.
- Une seule annonce active à la fois.
- Fermeture par clic sur l’overlay et auto-expiration après temporisation.

## Critères produit

- Toutes les actions opérateur V1 faisables sans panneau latéral.
- Lisibilité intacte sur projection 1080p/4K.
- Fonctionnement offline pour un match complet après cache initial.
