# Alex Runner

Un endless runner inspire du Chrome Dino, cree specialement pour les **30 ans d'Alexandre**.

## Le concept

Le joueur incarne Alex, un personnage avec la tete d'Alexandre, qui court, saute et glisse pour eviter les obstacles. Pour lancer le jeu, il faut connaitre une date bien particuliere... un indice : c'est un anniversaire.

## Comment jouer

| Action | Clavier | Mobile |
|--------|---------|--------|
| Sauter | Espace / Fleche haut | Tap sur l'ecran |
| Glisser | Fleche bas | Swipe vers le bas (maintenu) |

## Animations du joueur

- **Course** : mouvement de balancier realiste avec synchronisation croisee bras/jambes
- **Saut** : bras leves en Y, jambes repliees en arriere, squash & stretch a l'envol et a l'atterrissage
- **Glissade** : pieds en avant, corps incline en arriere, un bras leve au ciel

## Configuration

Deux variables sont disponibles en haut du fichier `index.html` pour faciliter les tests :

```javascript
const COLLISION_ENABLED = true;   // false = le joueur traverse les obstacles sans mourir
const DATE_REQUIRED = true;       // false = pas besoin d'entrer la date pour jouer
```

## Technique

- Fichier unique `index.html` (HTML + CSS + JS)
- Rendu Canvas 2D avec animations procedurales (zero sprite)
- Physique : gravite, squash & stretch avec ressort
- Zero dependance externe
- Compatible mobile (touch events)

## Hebergement

1. Creer un repo GitHub
2. Pousser le projet
3. Activer GitHub Pages (Settings > Pages > Source: main)
4. Partager le lien a Alexandre le jour J
