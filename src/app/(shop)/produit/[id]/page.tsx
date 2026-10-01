import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Gallery } from "@/components/Gallery";
import { OrderForm } from "@/components/OrderForm";
import { ProductCard } from "@/components/ProductCard";
import { StickyBuyBar } from "@/components/StickyBuyBar";
import { shopProducts } from "@/lib/catalog";
import { FreshBadge, StatusBadge } from "@/components/ProductBadges";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { waLink } from "@/lib/orders-shared";
import { depositFor, formatAr } from "@/lib/pricing";
import { freshness } from "@/lib/product-status";
import { getProduct } from "@/lib/products";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(props: PageProps<"/produit/[id]">): Promise<Metadata> {
  const product = await getProduct(Number((await props.params).id));
  if (!product || !product.active) return {};
  return {
    title: product.name,
    description: `${product.name} — ${formatAr(product.pricing.price)}, livrée à Tana.`,
    openGraph: { images: product.images.slice(0, 1) },
  };
}

export default async function ProductPage(props: PageProps<"/produit/[id]">) {
  const [product, settings] = await Promise.all([getProduct(Number((await props.params).id)), getSettings()]);
  if (!product || !product.active) notFound();
  const price = product.pricing.price;
  const deposit = depositFor(price, settings.depositPct);
  const inStock = product.status === "en_stock";
  const soldOut = product.status === "epuise";
  const similar = (await shopProducts())
    .filter((p) => p.id !== product.id && p.status !== "epuise" && p.category === product.category)
    .slice(0, 4);
  const [dMin, dMax] = inStock ? [settings.stockDeliveryMinDays, settings.stockDeliveryMaxDays] : [settings.deliveryMinDays, settings.deliveryMaxDays];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-16">
      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-ink">Accueil</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/recherche" className="hover:text-ink">Catalogue</Link></li>
          {product.category && (
            <>
              <li aria-hidden="true">/</li>
              <li><Link href={`/recherche?cat=${encodeURIComponent(product.category)}`} className="hover:text-ink">{product.category}</Link></li>
            </>
          )}
        </ol>
      </nav>
      <div className="grid gap-10 md:grid-cols-2">
      <div className="md:sticky md:top-24 md:self-start">
        <Gallery images={product.images} alt={product.name} />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {product.category && <p className="text-sm font-semibold tracking-wide text-muted uppercase">{product.category}</p>}
          <FreshBadge fresh={freshness(product, settings.badgeDays)} />
          <StatusBadge status={product.status} />
        </div>
        <h1 className="font-display mt-1 text-4xl sm:text-5xl">{product.name}</h1>
        <p className={`mt-4 text-3xl font-bold ${soldOut ? "text-black/40 line-through" : ""}`}>{formatAr(price)}</p>
        {!soldOut && (
          <p className="mt-1 text-sm text-black/60">
            Livrée à Tana · Acompte {formatAr(deposit)} ({settings.depositPct} %) à la commande, le reste à la livraison.
          </p>
        )}
        <div className="card mt-5 grid grid-cols-3 divide-x divide-black/10 text-center text-xs">
          <div className={`p-3 ${inStock ? "bg-emerald-50 text-emerald-900" : ""}`}>
            <p className="font-bold">{inStock ? "⚡ " : ""}{dMin}–{dMax} j</p>
            {inStock ? "Déjà à Tana" : "Sur commande"}
          </div>
          <div className="p-3"><p className="font-bold">Contrôle qualité</p>photo avant envoi</div>
          <div className="p-3"><p className="font-bold">Suivi</p>en ligne</div>
        </div>
        {product.description && <p className="mt-6 whitespace-pre-line text-black/80">{product.description}</p>}
        <div className="mt-8">
          {soldOut ? (
            <div className="card space-y-3 p-5 text-center">
              <p className="font-display text-2xl">Épuisé</p>
              <p className="text-sm text-black/60">Ce modèle n&apos;est plus disponible pour le moment. On peut te prévenir dès son retour.</p>
              <a
                href={waLink(settings.whatsapp, `Bonjour 261 WEAR ! Prévenez-moi quand « ${product.name} » sera de nouveau disponible. Ma pointure : `)}
                target="_blank"
                rel="noopener"
                className="btn w-full bg-[#25D366] py-4 text-white hover:brightness-95"
              >
                <WhatsAppIcon /> Me prévenir du retour en stock
              </a>
            </div>
          ) : (
            <>
              <OrderForm productId={product.id} sizes={product.sizes} price={price} />
              <StickyBuyBar price={formatAr(price)} label={product.name} />
            </>
          )}
        </div>
      </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-16" aria-labelledby="similar-title">
          <div className="flex items-end justify-between gap-4">
            <h2 id="similar-title" className="font-display text-3xl sm:text-4xl">Dans la même catégorie</h2>
            <Link href={`/recherche?cat=${encodeURIComponent(product.category)}`} className="shrink-0 py-2 text-sm font-semibold whitespace-nowrap underline">Tout voir</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {similar.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
