# Alex Runner

Un endless runner inspire du Chrome Dino, cree specialement pour les **30 ans d'Alexandre**.

## Le concept

Le joueur incarne Alex, qui court, saute et glisse pour eviter les obstacles dans deux univers qui s'alternent. L'experience est personnalisee : si le joueur saisit la **bonne date de naissance**, le personnage porte la vraie tete d'Alexandre. Sinon, un visage neutre. Indice : c'est un anniversaire.

## Comment jouer

| Action | Clavier | Mobile |
|--------|---------|--------|
| Sauter | Espace / Fleche haut | Tap sur l'ecran, bouton `SAUTER` |
| Glisser | Fleche bas (maintenue) | Swipe vers le bas, bouton `GLISSER` |
| Rejouer | Espace | Tap sur l'ecran |

Sur mobile, l'orientation **paysage** est imposee : en portrait, un overlay invite a tourner l'appareil.

## Themes et transitions

Le jeu demarre dans le theme **glacial** et bascule tous les **150 points** vers le theme **desert** (puis revient, et ainsi de suite). La transition se fait en traversant un **portail des enfers** plein-hauteur : double battant en bois sombre, piliers de pierre, halo pulsant et braises qui s'echappent. Les battants s'ouvrent automatiquement a l'approche du joueur.

### Theme glacial
- Banquise enneigee, montagnes aux sommets blancs, drapeaux suisses plantes
- Obstacles : stalagmites de glace (petit / grand / double)
- Creature volante : **Pingu**, le pingouin, qui emet un "nut nut" a l'apparition
- Flocons de neige qui tombent en continu

### Theme desert
- Ciel orangé, soleil chaud, mesas brunes, silhouettes de cactus
- Sol de sable avec rides et dunes
- Obstacles : murs de briques rouges matelassés
- Creature volante : **Mexicain volant** avec sombrero, moustache, poncho et ailes

## Animations du joueur

- **Course** : balancier realiste avec synchronisation croisee bras/jambes, lean avant, bob vertical
- **Saut** : bras leves en Y, jambes repliees en arriere, squash & stretch a l'envol et a l'atterrissage
- **Glissade** : pieds en avant, corps incline en arriere, un bras leve au ciel
- **Doudoune matelassee** en bleu (3 segments, col fourre, zip central en vue de face)
- **Ombre portee** qui se retracte en vol pour la sensation de poids
- **Screen shake** au contact d'un obstacle

## Social et hors ligne

- Au demarrage, le joueur peut se connecter ou creer un compte avec email/mot de passe ; un nouveau compte choisit ensuite un pseudo unique avant d'acceder au jeu.
- Le jeu et les scores recents restent disponibles sans connexion grace au stockage local et au service worker.
- Le classement affiche le meilleur score de chaque joueur et ses trois derniers runs connus.
- Le bouton `AMIS` permet d'ajouter des pseudos et de lancer des defis depuis l'ecran d'accueil ou apres une partie.
- Firebase Authentication attribue un `uid` a chaque joueur ; le pseudo est une propriete du profil et ne sert pas d'identite technique.
- Firebase est une synchronisation facultative quand le reseau est disponible ; le mode local reste disponible hors ligne.
- Un defi est un duel one-shot : chaque participant joue une seule manche, le meilleur score gagne 25 A-coins.
- Le run d'un participant est conserve dans `playedBy/{uid}` et son score ne peut plus etre remplace.
- Les A-coins sont depenses dans la boutique pour acheter et equiper des skins d'Alex.

Pour activer les defis et les amities entre appareils, active le fournisseur **Email/Password** dans Firebase Authentication puis publie les regles de `database.rules.json`. Le mode local continue de fonctionner si Firebase est indisponible.

## Ameliorations potentielles

- Ajouter la recuperation de mot de passe et la verification d'adresse email.
- Ajouter une vraie reception de defi, avec score cible, date limite et notification.
- Remplacer `localStorage` par IndexedDB pour une file de synchronisation plus volumineuse.
- Ajouter des filtres de classement (amis, semaine, saison) et des badges de progression.
- Ajouter une page de reglages pour le son, les vibrations et le contraste eleve.

## Gameplay

- Difficulte progressive (courbe smoothstep sur la vitesse, plafonnee a 14)
- Espacement minimum (120 px) entre obstacles pour eviter les situations injouables
- Pingus et mexicains apparaissent a **3 hauteurs** (50 / 70 / 90 px) : sauter ou glisser selon le cas
- Porte de transition : passable librement, ne tue pas
- Score affiche en continu, record conserve pendant la session

## Responsive

- Mobile-first : canvas pleine largeur, gros boutons tactiles, aucun card decoratif
- Landscape obligatoire sur smartphone (overlay rotation)
- Desktop (>900 px avec pointeur fin) : card "glass" centre, clavier uniquement, boutons tactiles masques
- Typography fluide via `clamp()`, safe-area insets pour les encoches

## Structure du projet

```
.
├── index.html              # HTML + meta tags + PWA manifest
├── style.css               # Feuille de styles extraite
├── manifest.webmanifest    # Configuration PWA (icônes, display)
├── sw.js                   # Service Worker v2 (cache + offline)
├── js/
│   ├── main.js             # Point d'entrée, écrans onboarding, install prompt PWA
│   ├── config.js           # Constantes (physique, canvas, thèmes, couleurs)
│   ├── state.js            # État global, canvas, contexte 2D, ressources
│   ├── game.js             # Boucle de jeu, physique, collision, scoring
│   ├── graphics.js         # Rendu Canvas 2D (personnages, obstacles, fond)
│   ├── input.js            # Gestionnaires d'événements (clavier, tactile)
│   └── firebase.js         # Leaderboard Realtime Database
├── assets/
│   ├── images/
│   │   └── alex_detoure.png    # Tête d'Alexandre détourée
│   └── sounds/
│       ├── nut_nut.mp3               # Son du saut (Pingu)
│       ├── je_m-apelle-moumede.mp3   # Interlude mariachi 0
│       ├── ouais_mamouaselle.mp3     # Interlude mariachi 1
│       ├── oulala_moumed.mp3         # Interlude mariachi 2
│       └── deception_pour_le_joueur_fr.mp3  # Son de mort
└── icons/
    └── ...                 # Icônes PWA (iOS, Android, Windows)
```

## Guide des modules

### `js/config.js`
Exporte les constantes immuables du jeu :
- Dimensions du canvas (`W=800, H=250`)
- Physique (`GRAVITY=0.6, JUMP_FORCE=-7`)
- Thèmes disponibles et palettes de couleurs
- Regex de détection iOS

### `js/state.js`
État global mutable + initialisation du contexte :
- Objet `state` (vitesse, score, frame, gameState: idle|running|over)
- Objets `dino` et objet obstacle actuel
- Singleton `canvas` et contexte 2D `ctx`
- Chargement des ressources (tête d'Alex, canvases offscreen)
- Initialisation des nuages et flocons

Tous les modules importent cet état et le mutent directement (singletons ES6 modules).

### `js/game.js`
Boucle de jeu et logique métier :
- `loop()` : boucle à 60 FPS avec timestep fixe
- `update()` : physique (gravité), collision, scoring, transitions de thèmes
- `jump()` et `duck()` : action du joueur
- `spawnObstacle()` : génération procédurale avec espacement minimum
- `checkCollision()` : AABB + point-in-box
- Portail des enfers : animation et passage transparent

Difficulté progressive : avant 600 pts courbe smoothstep, après courbe linéaire.

### `js/graphics.js`
Rendu Canvas 2D complet (~2200 lignes) :
- `draw()` : fonction maître appelée chaque frame
- `drawDino()` : personnage avec animations (course, saut, glissade, squash/stretch)
- `drawObstacleForTheme()` : dispatch vers renderers thème-spécifiques
- `drawBgLaRochelle/Vendee/Auvergne/Lyon/Alps()` : parallaxe layerée
- `drawPortal()` et `drawMariachi()` : transitions et créatures volantes
- UI : score, modal game-over, leaderboard

### `js/input.js`
Gestionnaires d'événements :
- Clavier : Espace / Flèche haut (sauter), Flèche bas (glisser)
- Tactile : tap (sauter), swipe bas (glisser), boutons mobiles
- Flags de prévention des doublons (dupJump, dupDuck)

### `js/firebase.js`
Intégration Firebase Realtime Database (v12.12.1) :
- `submitScore(playerName, finalScore)` : enregistrer le score
- `loadLeaderboard(currentScore)` : top 10 avec ranking
- `fetchPlayerBestScore(playerName)` : meilleur score du joueur
- `showLeaderboard()` / `hideLeaderboard()` : afficher/masquer modal

### `js/main.js`
Point d'entrée et onboarding :
- Écran de naissance (détection date)
- Écran de pseudo
- Invite d'installation PWA (deferred) pour web
- Détection iOS + lien "Add to Home Screen"
- Enregistrement Service Worker
- Vérification mise à jour SW (toutes les heures)
- Gestion de `SKIP_WAITING` pour forcer la mise à jour

## Configuration

Les constantes se trouvent dans `js/config.js` pour faciliter les tests :

```javascript
// Dans index.html - non utilisé, les constantes sont dans config.js
// Mais vous pouvez modifier dans config.js :
W = 800;
H = 250;
GRAVITY = 0.6;
JUMP_FORCE = -7;
```

## Technique

- **Architecture modulaire** : 7 modules ES6 + entry point, zéro dépendances externes (sauf Firebase v12)
- **Rendu** : Canvas 2D avec animations procédurales (zéro sprite, sauf tête d'Alex détourée)
- **Physique** : gravité, squash & stretch avec ressort, timestep fixe 60 FPS
- **État** : singleton `state` partagé par tous les modules via imports ES6
- **Thèmes** : dispatch via fonction sur `state.currentTheme` (9 renderers différents)
- **PWA** : Service Worker v2 (cache à 2 niveaux), install prompt, offline support
- **Firebase** : Realtime Database pour leaderboard persistant
- **Responsive** : viewport-fit=cover, safe-area insets, media queries, clamp() fluide

## Hebergement

1. Creer un repo GitHub
2. Pousser le projet
3. Activer GitHub Pages (Settings > Pages > Source: main)
4. Partager le lien a Alexandre le jour J
