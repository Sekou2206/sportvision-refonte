# Outils media day (06/10/2026)

Utilisés pour le media day Seniors de SF Villemomble (229 photos, 28 personnes).
Dossiers : `/Volumes/Expansion/SportVision V2/03_CLIENTS_CLUBS/<club>/<catégorie>/Groupe <catégorie>/Media day/`,
un sous-dossier par joueur « NN NOM Prénom » (NN = ordre de passage), et `_A TRIER` pour l'export Lightroom.

1. `decouper.py` : découpe la série par joueur d'après les temps morts (> 25 s), dans l'ordre de passage.
   Vérifier ensuite CHAQUE transition à l'oeil (planche) : à Villemomble, 3 corrections sur 28
   (une pose refaite après une pause, deux joueurs collés). Faire valider la planche par Fouka.
2. `fond_blanc.swift` : détoure le joueur (Vision, « détacher le sujet » de macOS) et le pose sur un
   blanc pur, à pleine résolution, métadonnées conservées. Compiler : `swiftc -O fond_blanc.swift -o fond_blanc`,
   puis `./fond_blanc "<dossier de sortie>" photo1.jpg photo2.jpg …`. 229 photos en quelques minutes.
   `fond_club.swift` : même détourage, mais le joueur est posé sur un fond du club (couleurs + écusson).
   `./fond_club "<fond.jpg>" "<dossier de sortie>" photo1.jpg …`. Sortie dans `<joueur>/fond Villemomble/`.
   Le fond se fabrique avec `fond_club.py` (deux variantes ; Fouka a retenu « filigrane » : un grand
   écusson derrière le joueur, bandeau marine en bas, petit écusson en haut à gauche). Fonds utilisés
   dans `Media day/_FONDS/`. Écusson Villemomble : seule source connue en 447 px
   (`~/Downloads/logo villemomble.jpeg`).
3. Rangement : version fond blanc dans le dossier du joueur, original déplacé dans `<joueur>/originaux/`.
4. `verser-galerie.mjs <reglages.json>` : verse le media day dans une galerie de l'OS (brouillon), en
   rejouant le code de l'OS (dérivés, filigrane, original sur R2), et marque chaque photo à son joueur
   (source « humain ») : avec le Pass, chacun retrouve les siennes. Reprenable. La mise en ligne reste
   le bouton de l'OS. Réglages de Villemomble : `Media day/_FONDS/versement-galerie.json`.
   Se lance depuis le worktree à jour (il lit `SportVision-OS-Full.html` et `_shared/r2.ts`).
