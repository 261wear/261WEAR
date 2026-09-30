# 261 WEAR — site boutique & back-office

Site de vente de chaussures premium sur commande (Chine → Antananarivo).

- **Catalogue** : photos, prix en Ariary, pointures.
- **Commande via WhatsApp** : le client choisit son modèle et sa pointure, la commande est enregistrée
  (N° `261-0001`…), puis il l'envoie sur WhatsApp avec la capture de son paiement Mobile Money.
- **Suivi de colis** : page de suivi par commande (lien privé) + recherche par numéro + téléphone sur `/suivi`.
- **Back-office** (`/admin`) :
  - produits : prix saisi en **RMB**, prix de vente en Ariary **calculé automatiquement** ;
  - commandes : statut étape par étape, montant reçu, **captures de paiement enregistrées**,
    bouton « Prévenir le client » (message WhatsApp pré-rempli avec le lien de suivi) ;
  - commandes manuelles (pour les commandes reçues sur Facebook / Instagram) ;
  - paramètres : taux RMB, transport/kg, marge, acompte, délais, numéro WhatsApp, infos de paiement.

## Calcul du prix

```
coût  = prix RMB × taux + poids (kg) × transport/kg + frais fixes
prix  = coût × (1 + marge %), arrondi au-dessus (ex. aux 5 000 Ar)
```

Exemple avec les réglages par défaut (taux 630, 80 000 Ar/kg, 1,2 kg, 5 000 Ar de frais, marge 35 %) :
150 ¥ → coût 195 500 Ar → **prix 265 000 Ar**.

**Produits « Disponible de suite »** (déjà à Tana) : le prix de vente part du **prix d'achat en Ariary**, transport
déjà compris :

```
coût  = prix d'achat Ar + frais fixes
prix  = coût × (1 + marge %), arrondi au-dessus
```

Exemple : achat 210 000 Ar → coût 215 000 Ar → **prix 295 000 Ar** (le taux RMB ne le change pas).

Règles (identiques dans la fiche produit, l'import, le changement de statut rapide et côté serveur) :
- *Sur commande* : prix RMB obligatoire ; *Disponible de suite* : prix d'achat Ar obligatoire ;
  *Épuisé* / *Brouillon* : au moins un des deux.
- Un produit peut avoir les deux prix : la base suit son statut, et la fiche montre l'autre scénario.
- Limites : RMB ≤ 100 000, Ar entre 1 000 et 50 000 000 (un prix en Ar tapé dans la colonne RMB est refusé),
  poids 0,1–20 kg, marge 0–500 %. Un prix forcé sous le coût est accepté avec une alerte « perte ».
- Si le prix change (taux, marge…) pendant qu'un client commande, la commande est refusée avec le nouveau prix,
  la page se met à jour et le client revalide : il paie toujours le prix qu'il a vu.

Le poids et la marge peuvent être modifiés produit par produit, et un prix peut être forcé.
Changer le taux dans « Prix & paramètres » met à jour tous les prix du site. Une commande garde le prix du
moment où elle a été passée.

## Statuts produit et badges

| Statut | Sur le site | Commande |
| --- | --- | --- |
| **Sur commande** | visible | oui, délai normal (7–14 j) |
| **Disponible de suite** | visible, badge « ⚡ Dispo de suite », section dédiée sur l'accueil | oui, délai court (1–2 j), sans étapes « Chine » dans le suivi ni dans la logistique |
| **Épuisé** | visible, photo grisée, en fin de liste | non : bouton WhatsApp « Me prévenir du retour en stock » |
| **Brouillon** | invisible | non |

Le statut se change dans la fiche produit, directement dans la liste des produits, ou via la colonne `statut` de
l'import (sur commande, en stock, épuisé, brouillon). Badges publics : **NEW** pendant N jours après la publication,
**↻ Mis à jour** pendant N jours après une modification (prix, statut…) ; N se règle dans les paramètres (14 par défaut).

## Recherche

- **Boutique** : barre de recherche dans l'en-tête (pleine largeur sur mobile), suggestions instantanées (photo, prix,
  disponibilité, mots surlignés), recherches récentes, catégories populaires, clavier (↑ ↓ Entrée Échap, `/` pour y
  aller). Insensible aux accents et majuscules, tolérante aux fautes (« runer » → Runner), comprend les pointures
  (« air 42 »). Page `/recherche` : filtres disponibilité / catégorie / pointure / prix avec compteurs, pastilles
  de filtres actifs, tris, liens partageables, résultats approchants si rien d'exact, et bouton « Demander ce modèle »
  sur WhatsApp quand rien ne correspond.
- **Back-office** : recherche produits (nom, réf., réf. fournisseur, catégorie) avec onglets par statut et « sans photo »,
  recherche commandes (n°, téléphone sous toute forme, client, modèle).

## Réseaux sociaux

Liens Facebook, Instagram et TikTok (+ WhatsApp) avec logos dans le pied de page, modifiables dans Paramètres ;
un lien vide masque le réseau.

## Import en masse (Produits → Import en masse)

**Étape 1 — fiches produits.** Un fichier CSV (Excel : *Enregistrer sous → CSV*) ou un copier-coller de cellules
depuis Excel / Google Sheets. Un modèle est téléchargeable dans le back-office.

| Colonne | Obligatoire | Exemple |
| --- | --- | --- |
| `ref` | oui | `AR261` (lettres, chiffres, `-` `_` `.`) |
| `nom` | pour un nouveau produit | `Air Runner 261 Black` |
| `prix_rmb` | pour « sur commande » | `150` |
| `prix_achat_ar` | pour « disponible de suite » | `210 000` ou `210.000` |
| `categorie`, `description` | non | `Sneakers` |
| `poids_kg`, `marge` | non (défaut des paramètres) | `1,2` · `40` |
| `prix_force` | non | `420000` |
| `pointures` | non | `39 40 41 42` |
| `fournisseur`, `ref_fournisseur` | non | `Putian Shoes Co` · `PT-8821` |
| `statut` | non (défaut choisi à l'import) | `sur commande`, `en stock`, `épuisé`, `brouillon` |

Pour une référence existante, une cellule vide garde la valeur actuelle : un fichier `ref;statut` suffit à changer la
disponibilité de tout le catalogue. Nouveau produit sans statut : seulement un prix Ar → « disponible de suite »,
seulement un prix RMB → « sur commande » (sinon le statut par défaut choisi à l'import).

Les en-têtes français ou anglais sont reconnus (Référence/SKU, Nom/Name, Prix/Price…), avec `;`, `,` ou tabulation.
Un aperçu montre le prix de vente calculé et les erreurs ligne par ligne avant l'import. Réimporter une référence
existante **met à jour** la fiche (photos et statut conservés), sans doublon. Les nouvelles fiches sont masquées
par défaut.

**Étape 2 — photos.** Sélectionner toutes les photos (ou un dossier) : chacune est rangée dans le produit dont la
référence commence son nom de fichier, dans l'ordre du numéro :
`AR261.jpg` (principale), `AR261-2.jpg`, `AR261_3.png`, `AR261 (4).jpg`. La référence la plus longue gagne
(`AR261-B-1.jpg` va dans `AR261-B`, pas dans `AR261`). Les photos sans référence connue et les formats non pris en
charge (HEIC) sont signalés. À la fin, un bouton met en ligne les produits qui viennent de recevoir leurs photos.

## Fournisseurs & logistique

- **Fournisseurs** : nom, WeChat, téléphone, ville, paiement (Alipay…), délai d'expédition habituel, notes.
  Chaque produit est relié à un fournisseur, avec sa référence chez ce fournisseur (fiche produit ou colonnes
  `fournisseur` / `ref_fournisseur` de l'import ; un fournisseur inconnu est créé automatiquement).
- **Logistique** :
  - *À commander* : les commandes dont l'acompte est reçu, regroupées par fournisseur, avec la même paire et la même
    pointure fusionnées (« 42 × 2 »), le total en RMB, le poids et le transport estimés. Le bouton
    **Copier la commande pour WeChat** prépare le message (anglais/chinois, réf. fournisseur, pointures, total, demande
    de photos QC). **Marquer comme commandées** fait passer toutes ces commandes à « Commandé chez le fournisseur ».
  - *En cours d'acheminement* : commandes chez le fournisseur ou expédiées, avec le nombre de jours écoulés ; une
    commande qui dépasse le délai habituel du fournisseur est signalée **en retard**.
- Le nom du fournisseur n'est jamais montré au client.

## Publication Facebook

Back-office → **Facebook** (ou le lien « Facebook → » d'un produit) : sélectionner des produits et leurs photos
(10 max). Le texte est généré (nom, prix, pointures, lien de commande, hashtags) et reste modifiable ; un aperçu
montre le rendu. Publier tout de suite ou **programmer** (entre 10 minutes et 30 jours à l'avance). L'historique
garde chaque publication (publiée, programmée ou en échec, avec le message d'erreur de Facebook).

Configuration (variables d'environnement Vercel) :

| Variable | Rôle |
| --- | --- |
| `FACEBOOK_PAGE_ID` | Identifiant de la Page (Page → À propos → Transparence de la Page, ou Meta Business Suite). |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Jeton **de Page** avec `pages_manage_posts` et `pages_read_engagement`. |
| `FACEBOOK_GRAPH_VERSION` | Optionnel, version de l'API Graph (défaut `v23.0`). |

Obtenir le jeton : créer une app sur developers.facebook.com (type *Business*), ouvrir l'**Explorateur de l'API
Graph**, générer un jeton utilisateur avec les deux permissions ci-dessus, l'échanger contre un jeton longue durée,
puis appeler `GET /me/accounts` : le `access_token` de la Page 261 WEAR est le jeton à utiliser (il n'expire pas tant
que le mot de passe et les droits ne changent pas). Le back-office affiche « Connecté à la Page … » quand tout est bon.
Sans configuration, l'écran permet de copier le texte et de télécharger les photos pour publier à la main.

## Sécurité

- Back-office : chaque action vérifie la session (une action rejouée sans session est sans effet) ; connexion limitée
  à 10 essais / 15 min.
- Formulaires publics : champ piège anti-robots, commandes limitées à 8 / heure et suivi à 20 essais / 10 min par
  connexion (limite en mémoire, par instance).
- Photos : signature du fichier vérifiée (un faux PNG est refusé), servies avec `nosniff` ; adresses d'images limitées
  aux uploads du site et au `https://`. Captures de paiement réservées au back-office en local ; sur Vercel Blob elles
  ont une adresse publique mais impossible à deviner.
- Recherche : le texte saisi est toujours affiché comme du texte ; les brouillons ne sont jamais exposés.

## Statuts de commande

En attente de paiement → Acompte reçu → Commandé chez le fournisseur → Expédié depuis la Chine →
Arrivé à Tana → En cours de livraison → Livré (ou Annulé).

La date de livraison estimée affichée au client est calculée à partir de la date « Acompte reçu » (7 à 14 jours
par défaut).

## Lancer en local

```bash
npm install
npm run dev          # http://localhost:3000 — back-office : /admin (mot de passe local : admin261)
```

En local, la base de données (PGlite) et les images sont stockées dans `.data/`.

## Mise en ligne sur Vercel

1. Importer le dépôt GitHub dans Vercel.
2. **Storage → Neon (Postgres)** : créer une base et la connecter au projet (ajoute `DATABASE_URL`).
3. **Storage → Blob** : créer un store et le connecter (ajoute `BLOB_READ_WRITE_TOKEN`) — pour les photos.
4. **Settings → Environment Variables** : ajouter `ADMIN_PASSWORD` (mot de passe du back-office, long et secret).
5. Redéployer, puis aller sur `/admin/parametres` pour régler le numéro WhatsApp, les infos de paiement et le taux.

Les tables sont créées automatiquement au premier chargement.

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Base Postgres (Neon). Absente en local → PGlite dans `.data/`. |
| `BLOB_READ_WRITE_TOKEN` | Stockage des photos (Vercel Blob). Absent en local → `.data/uploads/`. |
| `ADMIN_PASSWORD` | Mot de passe du back-office (obligatoire en production). |
| `ADMIN_SECRET` | Optionnel : clé de signature des sessions (sinon dérivée du mot de passe). |

## Stack

Next.js 16 (App Router, Server Actions), Tailwind CSS 4, Neon Postgres / PGlite, Vercel Blob.
