import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { popularCategories, shopProducts, shopSettings } from "@/lib/catalog";

// The home page shows the latest pairs; the full catalogue is paginated in /recherche.
const HOME_DROP = 12;

export default async function Home() {
  const [products, settings, categories] = await Promise.all([shopProducts(), shopSettings(), popularCategories()]);
  const inStock = products.filter((p) => p.status === "en_stock").slice(0, 4);
  // Pairs already shown in "Dispo de suite" are not repeated in the drop.
  const shown = new Set(inStock.map((p) => p.id));
  const drop = products.filter((p) => !shown.has(p.id)).slice(0, HOME_DROP);
  const steps = [
    ["01", "Choisis ta paire", "Sélectionne ton modèle et ta pointure, puis valide sur WhatsApp."],
    ["02", "Paie l'acompte", `${settings.depositPct} % par Mobile Money. Envoie la capture sur WhatsApp.`],
    ["03", "On commande pour toi", "Ta paire est commandée neuve, dans ta taille, et contrôlée avant l'envoi."],
    ["04", "Livrée à Tana", `En ${settings.deliveryMinDays} à ${settings.deliveryMaxDays} jours. Suis ton colis en direct sur le site.`],
  ];
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-24 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-accent uppercase">Drop en cours</p>
            <h1 className="font-display mt-4 text-6xl leading-[0.95] sm:text-7xl">
              Représente
              <br />
              le 261.
            </h1>
            <p className="mt-6 max-w-md text-lg text-white/70">
              Des sneakers premium qui durent, pas des paires à 50k qui lâchent en un mois. Sur commande, livrées à Tana.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#drop" className="btn-accent">Voir le drop</Link>
              <Link href="/suivi" className="btn border border-white/20 text-white hover:border-white">Suivre ma commande</Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ["100 %", "neuves, commandées pour toi"],
              [`${settings.deliveryMinDays}-${settings.deliveryMaxDays} j`, "livraison à Tana"],
              ["Photo", "de contrôle qualité de ta paire avant l'envoi"],
            ].map(([big, small]) => (
              <div key={big} className="rounded-2xl border border-white/10 p-4">
                <p className="font-display text-2xl text-accent sm:text-3xl">{big}</p>
                <p className="mt-2 text-xs text-white/60">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <nav aria-label="Catégories" className="mx-auto max-w-6xl px-4 pt-8">
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <li key={c.value} className="shrink-0">
                <Link href={`/recherche?cat=${encodeURIComponent(c.value)}`} className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-ink">
                  {c.value} <span className="text-xs font-normal text-muted">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {inStock.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-4xl sm:text-5xl">
              <span className="text-emerald-700">⚡</span> Dispo de suite
            </h2>
            <Link href="/recherche?dispo=en_stock" className="shrink-0 py-2 text-sm font-semibold whitespace-nowrap underline">Tout voir</Link>
          </div>
          <p className="mt-1 text-sm text-muted">Déjà à Tana · livrée en {settings.stockDeliveryMinDays} à {settings.stockDeliveryMaxDays} jours.</p>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {inStock.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section id="drop" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl sm:text-5xl">Le drop</h2>
          <Link href="/recherche" className="py-2 text-sm font-semibold underline">Tout le catalogue ({products.length})</Link>
        </div>
        {products.length ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {drop.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>
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

      {/* Same look as the "Comment commander" carousel on the social networks. */}
      <section className="bg-accent text-ink">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-5xl leading-[0.9] sm:text-7xl">Comment<br />commander</h2>
          <ol className="mt-10 grid border-t-[3px] border-ink sm:grid-cols-2 sm:border-t-0 lg:grid-cols-4">
            {steps.map(([n, title, body]) => (
              <li key={n} className="flex gap-5 border-b-[3px] border-ink py-5 sm:flex-col sm:gap-2 sm:border-t-[3px] sm:border-b-0 sm:pr-6 lg:border-b-[3px]">
                <span className="font-display w-14 shrink-0 text-5xl leading-none">{n}</span>
                <span>
                  <span className="block text-lg font-bold">{title}</span>
                  <span className="mt-1 block text-sm text-ink/75">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
