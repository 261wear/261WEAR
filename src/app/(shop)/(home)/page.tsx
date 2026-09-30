import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { shopProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";

export default async function Home() {
  const [products, settings] = await Promise.all([shopProducts(), getSettings()]);
  const inStock = products.filter((p) => p.status === "en_stock");
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
              ["Photo QC", "de ta paire avant l'envoi"],
            ].map(([big, small]) => (
              <div key={big} className="rounded-2xl border border-white/10 p-4">
                <p className="font-display text-2xl text-accent sm:text-3xl">{big}</p>
                <p className="mt-2 text-xs text-white/60">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {inStock.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-4xl sm:text-5xl">
              <span className="text-emerald-600">⚡</span> Dispo de suite
            </h2>
            <Link href="/recherche?dispo=en_stock" className="text-sm font-semibold underline">Tout voir</Link>
          </div>
          <p className="mt-1 text-sm text-muted">Déjà à Tana · livrée en {settings.stockDeliveryMinDays} à {settings.stockDeliveryMaxDays} jours.</p>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {inStock.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section id="drop" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl sm:text-5xl">Le drop</h2>
          <Link href="/recherche" className="text-sm font-semibold underline">Tout le catalogue ({products.length})</Link>
        </div>
        {products.length ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="card mt-8 p-10 text-center text-muted">Le prochain drop arrive bientôt. Reste connecté sur nos réseaux.</p>
        )}
      </section>

      <section className="border-y border-black/10 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-4xl sm:text-5xl">Comment ça marche</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([n, title, body]) => (
              <div key={n}>
                <p className="font-display text-5xl text-black/15">{n}</p>
                <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-black/60">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
