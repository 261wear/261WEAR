import type { Metadata } from "next";
import Link from "next/link";
import { HERO_PHOTOS, HeroBackdrop } from "@/components/HeroBackdrop";
import { BoltIcon, CalendarIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { ProductCard } from "@/components/ProductCard";
import { popularCategories, shopProducts, shopSettings } from "@/lib/catalog";
import { pageUrls } from "@/lib/site";

export const metadata: Metadata = pageUrls("/");

// The home page shows the latest pairs; the full catalogue is paginated in /recherche.
const HOME_DROP = 12;

export default async function Home() {
  const [products, settings, categories] = await Promise.all([shopProducts(), shopSettings(), popularCategories()]);
  const inStock = products.filter((p) => p.status === "en_stock").slice(0, 4);
  // Pairs already shown in "Dispo de suite" are not repeated in the drop.
  const shown = new Set(inStock.map((p) => p.id));
  const drop = products.filter((p) => !shown.has(p.id)).slice(0, HOME_DROP);
  const heroPhotos = products.flatMap((p) => p.images.slice(0, 1)).slice(0, HERO_PHOTOS);
  const steps = [
    ["01", "Choisis ta paire", "Sélectionne ton modèle et ta pointure, puis valide sur WhatsApp."],
    ["02", "Paie l'acompte", `${settings.depositPct} % par Mobile Money. Envoie la capture sur WhatsApp.`],
    ["03", "On commande pour toi", "Ta paire est commandée neuve, dans ta taille, et contrôlée avant l'envoi."],
    ["04", "Livrée à Tana", `En ${settings.deliveryMinDays} à ${settings.deliveryMaxDays} jours. Suis ton colis en direct sur le site.`],
  ];
  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <HeroBackdrop photos={heroPhotos} />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-12 sm:pt-28 sm:pb-16">
          <p className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-accent uppercase">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Drop en cours
          </p>
          <h1 className="font-display mt-5 text-[clamp(3.25rem,16vw,4.5rem)] leading-[0.9] drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] sm:text-8xl lg:text-9xl">
            Représente
            <br />
            le <span className="relative inline-block">
              261<span className="text-accent">°</span>
              {/* Brush signature under the 261, as on the brand visuals: one tapered stroke, then a Z flick. */}
              <svg aria-hidden="true" viewBox="0 0 320 64" preserveAspectRatio="none" className="absolute -bottom-7 -left-[8%] h-9 w-[112%] text-accent sm:-bottom-10 sm:h-14">
                <path d="M2 46 C 90 34, 200 20, 306 8 L 310 18 C 206 30, 104 46, 10 62 Z" fill="currentColor" />
                <path d="M30 50 C 110 40, 190 30, 260 22" fill="none" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
                <path d="M296 16 L 172 46 L 302 41" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </h1>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="#drop" className="btn-accent px-7 py-3.5 text-base shadow-[0_0_32px_rgba(198,255,61,0.35)]">
              Voir le drop <span aria-hidden="true">→</span>
            </Link>
            <Link href="/suivi" className="btn border border-white/30 bg-ink/60 px-7 py-3.5 text-base text-white hover:border-white">
              Suivre ma commande
            </Link>
          </div>
          <ul className="mt-12 grid max-w-2xl grid-cols-3 gap-3 text-center sm:mt-16 sm:gap-4">
            {[
              [<TruckIcon key="i" size={28} />, "100 %", "neuves, commandées pour toi"],
              [<CalendarIcon key="i" size={28} />, `${settings.deliveryMinDays}-${settings.deliveryMaxDays} J`, "livraison à Tana"],
              [<ShieldIcon key="i" size={28} />, "Photo", "de contrôle qualité avant l'envoi"],
            ].map(([icon, big, small]) => (
              <li key={String(big)} className="flex flex-col items-center rounded-2xl border border-white/10 bg-ink/75 px-2 py-5 sm:px-4 sm:py-6">
                <span className="text-accent">{icon}</span>
                <p className="font-display mt-3 text-[clamp(1.375rem,7.5vw,1.875rem)] leading-none whitespace-nowrap sm:text-4xl">{big}</p>
                <p className="mt-2 text-xs leading-snug text-white/60 sm:text-sm">{small}</p>
              </li>
            ))}
          </ul>
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
            <h2 className="font-display text-[clamp(1.75rem,8.5vw,2.25rem)] whitespace-nowrap sm:text-5xl">
              <span className="flex items-center gap-2.5 sm:gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-accent sm:h-12 sm:w-12">
                  <BoltIcon size={22} />
                </span>
                Dispo de suite
              </span>
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
            {/* Below the hero: no high-priority photos competing with the first paint. */}
            {drop.map((p) => (
              <ProductCard key={p.id} product={p} />
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

