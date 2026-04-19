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

## Configuration

Deux variables en haut de `index.html` pour faciliter les tests :

```javascript
const COLLISION_ENABLED = true;   // false = le joueur traverse les obstacles sans mourir
const DATE_REQUIRED = true;       // false = skip l'ecran de date, tete neutre par defaut
```

## Technique

- Fichier unique `index.html` (HTML + CSS + JS, zero dependance externe)
- Rendu Canvas 2D avec animations procedurales (zero sprite, sauf la tete d'Alex detouree)
- Physique : gravite, squash & stretch avec ressort
- Systeme de themes dispatch : chaque fonction de rendu (ciel, sol, obstacles, volants) branche sur `currentTheme`
- Tete neutre pre-rendue sur un canvas offscreen
- Meta viewport avec `viewport-fit=cover` et desactivation du zoom pour une experience jeu

## Hebergement

1. Creer un repo GitHub
2. Pousser le projet
3. Activer GitHub Pages (Settings > Pages > Source: main)
4. Partager le lien a Alexandre le jour J
