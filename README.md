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

Le poids et la marge peuvent être modifiés produit par produit, et un prix peut être forcé.
Changer le taux dans « Prix & paramètres » met à jour tous les prix du site. Une commande garde le prix du
moment où elle a été passée.

## Import en masse (Produits → Import en masse)

**Étape 1 — fiches produits.** Un fichier CSV (Excel : *Enregistrer sous → CSV*) ou un copier-coller de cellules
depuis Excel / Google Sheets. Un modèle est téléchargeable dans le back-office.

| Colonne | Obligatoire | Exemple |
| --- | --- | --- |
| `ref` | oui | `AR261` (lettres, chiffres, `-` `_` `.`) |
| `nom` | oui | `Air Runner 261 Black` |
| `prix_rmb` | oui | `150` |
| `categorie`, `description` | non | `Sneakers` |
| `poids_kg`, `marge` | non (défaut des paramètres) | `1,2` · `40` |
| `prix_force` | non | `420000` |
| `pointures` | non | `39 40 41 42` |

Les en-têtes français ou anglais sont reconnus (Référence/SKU, Nom/Name, Prix/Price…), avec `;`, `,` ou tabulation.
Un aperçu montre le prix de vente calculé et les erreurs ligne par ligne avant l'import. Réimporter une référence
existante **met à jour** la fiche (photos et statut conservés), sans doublon. Les nouvelles fiches sont masquées
par défaut.

**Étape 2 — photos.** Sélectionner toutes les photos (ou un dossier) : chacune est rangée dans le produit dont la
référence commence son nom de fichier, dans l'ordre du numéro :
`AR261.jpg` (principale), `AR261-2.jpg`, `AR261_3.png`, `AR261 (4).jpg`. La référence la plus longue gagne
(`AR261-B-1.jpg` va dans `AR261-B`, pas dans `AR261`). Les photos sans référence connue et les formats non pris en
charge (HEIC) sont signalés. À la fin, un bouton met en ligne les produits qui viennent de recevoir leurs photos.

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
