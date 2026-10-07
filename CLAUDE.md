@AGENTS.md

# 261° WEAR — notes de travail

Boutique de sneakers (Next.js 16 App Router, Tailwind 4, Postgres Supabase en prod / PGlite en local).
Répondre à l'utilisateur en français. Commits en français, dans le style de `git log`.

## Mise en production

- `git push origin main` déclenche le déploiement Netlify (site `079ea287-3e94-4f7b-92e2-10a011464509`,
  https://261wear.com ; `261wear.netlify.app` redirige en 301 via `netlify.toml`). Suivre l'état : `npx netlify api listSiteDeploys --data '{"site_id":"…","per_page":1}'`.
- Badge « Powered by Netlify » coupé (Project configuration › General) : il recouvrait la barre d'achat mobile.
  Le revérifier si le projet est recréé.
- Domaine `261wear.com` enregistré chez Cloudflare (zone `1449b2da6450745b12a54d9d3d02c796`), DNS seul (nuage gris) :
  `@` CNAME `apex-loadbalancer.netlify.com`, `www` CNAME `261wear.netlify.app`. Certificat Let's Encrypt géré par Netlify ;
  ne pas ajouter `www` en alias (Netlify l'ajoute seul avec le domaine principal, le doublon bloquait le certificat).
  L'adresse publique du code (`siteUrl()`) vient de la variable `URL` de Netlify, figée au build : redéployer après
  un changement de domaine principal.
- Avant chaque push : `npx next build` **puis** `npx tsc --noEmit -p .` et `npx eslint .`. Le build régénère les types
  globaux (`PageProps`, `LayoutProps`, `RouteContext`) : ne pas supprimer `.next/types`. Si `tsc` cite une page
  supprimée dans `.next/dev/types/validator.ts`, effacer `.next/dev/types` et relancer le build.

## Base locale (PGlite, `.data/pglite`)

- Un seul processus à la fois : arrêter `next dev` / `next start` avant un script sur la base.
- PGlite n'écrit vraiment sur le disque qu'à sa fermeture propre : tuer le serveur peut perdre les dernières écritures,
  voire corrompre la base (arrivé le 3 octobre 2026 ; copie gardée dans `.data/pglite-corrompue-2026-10-05`).
- Recréer une base de démo : supprimer `.data/pglite`, puis `node scripts/seed-dev.mjs` (schéma de `src/lib/schema.ts`
  + 12 paires factices). Puis effacer `.next/dev/cache` (et `.next/cache` pour `next start`) : le catalogue est un
  instantané gardé un jour.
- Mot de passe admin local par défaut : celui de `src/lib/auth.ts` (hors production).

## Quotas (Netlify, Supabase, stockage d'images)

Offres gratuites, sans recharge : crédits Netlify épuisés = **site coupé jusqu'au cycle suivant**. Cycles du 5 au 4
(Netlify) et du 5 au 5 (Supabase). Usage : https://app.netlify.com/teams/261wear/billing/usage et
https://supabase.com/dashboard/org/lqfwalffualpmbiimglm/usage (lisibles dans Chrome, compte connecté).

- **Chaque mise en ligne coûte 15 crédits Netlify (sur 300) et ~90 Mo de trafic Supabase (sur 5 Go)** : le build relit
  tout le catalogue. C'est le premier poste des deux côtés (7 octobre : 154 crédits et 1,14 Go consommés, presque
  tout en 12 builds les 5 et 6 octobre ; le trafic visiteurs, lui, faisait 86 Mo et 4 300 requêtes). Regrouper les
  changements en un seul push, ne pas relancer de build pour rien, consulter l'usage avant un push.
- Trafic visiteurs : ~70 crédits par mois pour 100 visiteurs par jour (estimation de la page admin « Limites »). Une campagne
  ou une vidéo qui marche peut vider le reste du mois : passer en Personal (9 $/mois, 1 000 crédits, recharge
  possible) avant une pub payante.

- Pages boutique servies depuis le cache (revalidate 1 jour) ; recherche et catalogue servis par le CDN
  (`Netlify-Vary`). Ne pas ajouter de lecture de base par visiteur.
- Photos fournisseur (szwego) redimensionnées par leur serveur : `miniUrl` (240 px) pour les vignettes de la galerie,
  `thumbUrl` (600 px) pour les grilles,
  `photoSrcSet` (600/1000/1600) pour la galerie, `szwegoUrl(…, 300, 70)` pour le fond du hero (12 photos distinctes).
- Pas de crawl complet du site en prod pour tester (7 800 fiches = autant d'appels de fonctions) : échantillonner.

## Identité visuelle (moodboard : `../Moodboard/`)

- Noir encre `#0B0B0C`, craie `#F4F2EE`, citron `#C6FF3D` (prix, « ° », badges, en touche rare), vert dispo
  `#047857` (seulement « Dispo de suite »). Titres Anton en majuscules, textes Inter.
- Le logo et le titre s'écrivent « 261° » avec le degré en citron. Prix en citron sur fond noir.
- Pas d'emoji côté boutique : icônes au trait dans `src/components/icons.tsx` (éclair `BoltIcon` pour « Dispo de suite »).
- Cadre Néon (contour citron doux) pour les paires en stock ; rendu « soft », pas surchargé.

## Chargements et animations

- `LoadingRegion` (squelette à la forme de la page) + `BrandLoader` au centre : visible après 300 ms, au moins 800 ms
  une fois affiché, sortie en fondu 250 ms. Nouvelle page en fondu 300 ms via `(shop)/template.tsx` (opacité seulement :
  un transform casserait les éléments `fixed` comme la barre d'achat mobile). Garder `prefers-reduced-motion`.
- Pas de `backdrop-blur` au-dessus du fond animé du hero (coûteux sur les vieux téléphones).

## Tester

- Vérifier le rendu de 320 px (iPhone SE) à 430 px : les chiffres et titres doivent tenir sur une ligne.
- La fenêtre Chrome pilotée par l'extension est souvent masquée : captures qui expirent, animations figées, React non
  hydraté. Ce n'est pas un bug du site. Pour un test fiable, piloter un Chrome headless via CDP
  (`chrome.exe --headless=new --remote-debugging-port=…`) ; Lighthouse : `npx -y lighthouse@12 <url> --form-factor=mobile`
  (le quota PageSpeed Insights gratuit est vite épuisé).
- Formulaires sans JavaScript : ils doivent marcher aussi en envoi classique (`useFormAction`) ; les tester en rejouant
  le POST du formulaire avec ses champs cachés `$ACTION_*`.
