import type { Metadata } from "next";
import Link from "next/link";
import { HeroShowcase } from "@/components/HeroShowcase";
import { BoltIcon } from "@/components/icons";
import { ShuffledGrid } from "@/components/ShuffledGrid";
import { toCard } from "@/lib/card";
import { popularCategories, shopProducts, shopSettings } from "@/lib/catalog";
import { salesByProduct } from "@/lib/orders";
import { brandLogo } from "@/lib/brand-logos";
import { toHeroPair } from "@/lib/hero";
import { sample } from "@/lib/shuffle";
import { pageUrls } from "@/lib/site";

export const metadata: Metadata = pageUrls("/");

// The home page shows pairs drawn at random from the whole catalogue, a new draw
// at each visit; the full catalogue is paginated in /recherche.
const HOME_DROP = 12;
const HOME_STOCK = 4;
// Pools sent with the page, redrawn by the server once a day (when the cached
// page is rebuilt); the browser picks the pairs shown from them. ~100 light
// cards keep the page small and give a different drop at each visit.
const DROP_POOL = 96;
const STOCK_POOL = 24;
// Paires du hero (rendues par le serveur, la première est fixe pour la journée).
const HERO_PAIRS = 8;
// Marques du défilement : jusqu'à 24, la liste est répétée pour dépasser la largeur d'un grand écran.
const BRANDS_MAX = 24;
const BRANDS_MIN_ITEMS = 16;

export default async function Home() {
  const [products, settings, popular, sales] = await Promise.all([shopProducts(), shopSettings(), popularCategories(), salesByProduct()]);
  // Marques classées par ventes, puis par taille du catalogue.
  const brandSales = new Map<string, number>();
  for (const p of products) brandSales.set(p.category, (brandSales.get(p.category) ?? 0) + (sales.get(p.id) ?? 0));
  const categories = [...popular].sort((a, b) => (brandSales.get(b.value) ?? 0) - (brandSales.get(a.value) ?? 0) || b.count - a.count);
  const inStock = sample(products.filter((p) => p.status === "en_stock"), STOCK_POOL).map(toCard);
  // "Dispo de suite" pairs are not repeated in the drop; sold-out ones stay in the search.
  const drop = sample(products.filter((p) => p.status === "sur_commande"), DROP_POOL).map(toCard);
  // Hero : les meilleures ventes d'abord (jusqu'à la moitié), complétées au hasard. Sans commande : tout au hasard.
  const heroPool = products.filter((p) => p.status !== "epuise" && p.images[0]);
  const sellers = heroPool.filter((p) => sales.has(p.id)).sort((a, b) => (sales.get(b.id) ?? 0) - (sales.get(a.id) ?? 0)).slice(0, HERO_PAIRS / 2);
  const sellerIds = new Set(sellers.map((p) => p.id));
  const heroPairs = [...sellers, ...sample(heroPool.filter((p) => !sellerIds.has(p.id)), HERO_PAIRS - sellers.length)].map((p) => toHeroPair(p, settings));
  const brands = categories.slice(0, BRANDS_MAX);
  const brandRow = brands.length ? Array.from({ length: Math.ceil(BRANDS_MIN_ITEMS / brands.length) }, () => brands).flat() : [];
  const steps = [
    ["01", "Choisis ta paire", "Sélectionne ton modèle et ta pointure, puis valide sur WhatsApp."],
    ["02", "Paie l'acompte", `${settings.depositPct} % par Mobile Money. Envoie la capture sur WhatsApp.`],
    ["03", "On commande pour toi", "Ta paire est commandée neuve, dans ta taille, et contrôlée avant l'envoi."],
    ["04", "Livrée à Tana", `En ${settings.deliveryMinDays} à ${settings.deliveryMaxDays} jours. Suis ton colis en direct sur le site.`],
  ];
  return (
    <>
      {heroPairs.length ? (
        <HeroShowcase pairs={heroPairs} />
      ) : (
        <section className="bg-peach text-ink">
          <div className="mx-auto max-w-6xl px-4 py-24 text-center">
            <h1 className="font-display text-6xl sm:text-8xl">
              Représente le 261<span className="text-white">°</span>
            </h1>
            <Link href="/suivi" className="btn-dark mt-8 px-7 py-3.5 text-base">Suivre ma commande</Link>
          </div>
        </section>
      )}

      {/* Défilement des logos de marques du catalogue : chacun mène à sa catégorie (le survol met le défilement en pause). */}
      {brandRow.length > 0 && (
        <nav aria-label="Marques" className="group/brands overflow-hidden border-b border-white/10 bg-ink py-10 text-white sm:py-14">
          <ul className="ticker-track flex w-max items-center group-hover/brands:[animation-play-state:paused]">
            {[0, 1].flatMap((k) =>
              brandRow.map((c, i) => {
                const logo = brandLogo(c.value);
                return (
                  <li key={`${k}-${i}`} aria-hidden={k === 1 ? true : undefined}>
                    <Link href={`/recherche?cat=${encodeURIComponent(c.value)}`} tabIndex={k === 1 ? -1 : undefined} className="flex h-16 items-center px-8 opacity-75 transition hover:opacity-100 sm:h-20 sm:px-14">
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo} alt={c.value} className="h-9 w-auto max-w-40 brightness-0 invert sm:h-12 sm:max-w-52" />
                      ) : (
                        <span className="font-display text-3xl whitespace-nowrap sm:text-4xl">{c.value}</span>
                      )}
                    </Link>
                  </li>
                );
              }),
            )}
          </ul>
        </nav>
      )}

      {inStock.length > 0 && (
        <section className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-[clamp(2rem,9vw,3.5rem)] leading-none whitespace-nowrap">
                <span className="flex items-center gap-2.5 sm:gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pistachio text-ink sm:h-14 sm:w-14">
                    <BoltIcon size={24} />
                  </span>
                  Dispo de suite
                </span>
              </h2>
              <Link href="/recherche?dispo=en_stock" className="shrink-0 py-2 text-sm font-semibold whitespace-nowrap underline">Tout voir</Link>
            </div>
            <p className="mt-2 text-sm text-white/70">Déjà à Tana · livrée en {settings.stockDeliveryMinDays} à {settings.stockDeliveryMaxDays} jours.</p>
            <ShuffledGrid pool={inStock} count={HOME_STOCK} className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4" />
          </div>
        </section>
      )}

      <section id="drop" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-[clamp(2rem,9vw,3.5rem)] leading-none">Le drop</h2>
          <Link href="/recherche" className="py-2 text-sm font-semibold underline">Tout le catalogue ({products.length})</Link>
        </div>
        {products.length ? (
          // Below the hero: no high-priority photos competing with the first paint.
          <ShuffledGrid pool={drop} count={HOME_DROP} className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4" />
        ) : null}
        {products.length > HOME_DROP && (
          <div className="mt-10 text-center">
            <Link href="/recherche?tri=nouveautes" className="btn-dark">Voir les {products.length} modèles</Link>
          </div>
        )}
        {!products.length && (
          <p className="card mt-8 p-10 text-center text-muted">Le prochain drop arrive bientôt. Reste connecté sur nos réseaux.</p>
        )}
      </section>

      {/* Quatre étapes sur fond bleu ciel : la page alterne les couleurs de section en section. */}
      <section className="bg-sky text-ink">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="font-display text-[clamp(2.5rem,11vw,5rem)] leading-[0.92]">Comment<br />commander</h2>
          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([n, title, body]) => (
              <li key={n} className="flex gap-5 rounded-3xl bg-white p-6 sm:flex-col sm:gap-3">
                <span className="font-display w-14 shrink-0 text-5xl leading-none text-ink/30">{n}</span>
                <span>
                  <span className="font-display block text-xl leading-tight">{title}</span>
                  <span className="mt-1.5 block text-sm text-ink/75">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
