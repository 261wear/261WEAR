import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { Gallery } from "@/components/Gallery";
import { ProductCard } from "@/components/ProductCard";
import { StickyBuyBar } from "@/components/StickyBuyBar";
import { WhatsAppOrder } from "@/components/WhatsAppOrder";
import { shopProduct, shopProducts, shopSettings } from "@/lib/catalog";
import { FreshBadge, StatusBadge } from "@/components/ProductBadges";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { BoltIcon, PinIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { waLink } from "@/lib/orders-shared";
import { depositFor, formatAr } from "@/lib/pricing";
import { freshness } from "@/lib/product-status";
import { OPEN_GRAPH, jsonLd as serializeJsonLd, siteUrl } from "@/lib/site";
import { categoryPath, productBrand, productId, productSummary } from "@/lib/shop-seo";

// Product pages are rendered on first visit, then served from the cache until
// the catalogue changes (or one day, for the date-based badges). Nothing is
// generated at build time.
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata(props: PageProps<"/produit/[id]">): Promise<Metadata> {
  const id = productId((await props.params).id);
  if (!id) notFound();
  const [product, settings] = await Promise.all([shopProduct(id), shopSettings()]);
  if (!product || !product.active) notFound();
  const description = productSummary(product, settings);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/produit/${product.id}` },
    openGraph: { ...OPEN_GRAPH, title: `${product.name} · 261° WEAR`, description, url: `/produit/${product.id}`, images: product.images.length ? product.images.slice(0, 1) : ["/opengraph-image.png"] },
    twitter: { card: "summary_large_image", title: product.name, description, images: product.images.length ? product.images.slice(0, 1) : ["/opengraph-image.png"] },
  };
}

export default async function ProductPage(props: PageProps<"/produit/[id]">) {
  const rawId = (await props.params).id;
  const id = productId(rawId);
  if (!id) notFound();
  const [product, settings] = await Promise.all([shopProduct(id), shopSettings()]);
  if (!product || !product.active) notFound();
  if (rawId !== String(id)) permanentRedirect(`/produit/${id}`);
  const price = product.pricing.price;
  const deposit = depositFor(price, settings.depositPct);
  const inStock = product.status === "en_stock";
  const soldOut = product.status === "epuise";
  const similar = (await shopProducts())
    .filter((p) => p.id !== product.id && p.status !== "epuise" && p.category === product.category)
    .slice(0, 4);
  // Product rich result for search engines (price, availability). "<" is
  // escaped so a product name can never close the script tag.
  const base = siteUrl();
  const brand = productBrand(product.name);
  const breadcrumbs = [{ name: "Accueil", path: "/" }, { name: "Chaussures", path: "/chaussures" },
    ...(product.category ? [{ name: product.category, path: categoryPath(product.category) }] : []),
    { name: product.name, path: `/produit/${product.id}` }];
  const jsonLd = serializeJsonLd([{
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${base}/produit/${product.id}#produit`,
    name: product.name,
    image: product.images.slice(0, 4),
    ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
    ...(product.sizes.length ? { size: product.sizes } : {}),
    ...(product.ref ? { sku: product.ref } : {}),
    ...(product.category ? { category: product.category } : {}),
    description: product.description || productSummary(product, settings),
    offers: {
      "@type": "Offer",
      url: `${siteUrl()}/produit/${product.id}`,
      priceCurrency: "MGA",
      price,
      availability: soldOut ? "https://schema.org/OutOfStock" : inStock ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": `${base}/#boutique` },
    },
  }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumbs.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${base}${item.path}` })) }]);
  const [dMin, dMax] = inStock ? [settings.stockDeliveryMinDays, settings.stockDeliveryMaxDays] : [settings.deliveryMinDays, settings.deliveryMaxDays];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-2 pb-28 md:pt-4 md:pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <nav aria-label="Fil d'Ariane" className="mb-2 text-sm text-muted [&_a]:inline-block [&_a]:py-2">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-ink">Accueil</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/chaussures" className="hover:text-ink">Catalogue</Link></li>
          {product.category && (
            <>
              <li aria-hidden="true">/</li>
              <li><Link href={categoryPath(product.category)} className="hover:text-ink">{product.category}</Link></li>
            </>
          )}
        </ol>
      </nav>
      {/* grid-cols-1 (minmax(0, 1fr)): without it the column takes the photo's natural width and the page overflows on phones. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
      {/* Full width on phones: the photo is what sells the pair. */}
      <div className="-mx-4 md:sticky md:top-24 md:mx-0 md:self-start">
        <Gallery images={product.images} alt={product.name} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {product.category && <p className="text-sm font-semibold tracking-wide text-muted uppercase">{product.category}</p>}
          <FreshBadge fresh={freshness(product, settings.badgeDays)} />
          <StatusBadge status={product.status} />
        </div>
        <h1 className="font-display mt-1 text-3xl leading-tight [overflow-wrap:anywhere] sm:text-5xl">{product.name}</h1>
        {/* Moodboard: the price always visible, bold, citron on black. */}
        <p className={`mt-3 font-bold ${soldOut ? "text-3xl text-black/40 line-through" : "inline-block rounded-lg bg-ink px-3 py-1 text-2xl text-accent sm:text-3xl"}`}>{formatAr(price)}</p>
        {!soldOut && (
          <p className="mt-1 text-sm text-black/60">
            Livrée à Tana · Acompte {formatAr(deposit)} ({settings.depositPct} %) à la commande, le reste à la livraison.
          </p>
        )}
        <div className="card mt-5 grid grid-cols-3 divide-x divide-black/10 overflow-hidden text-center text-xs">
          <div className={`flex flex-col items-center gap-1 p-3 ${inStock ? "bg-dispo text-paper" : ""}`}>
            {inStock ? <BoltIcon size={18} className="text-accent" /> : <TruckIcon size={18} />}
            <p className="font-bold">{dMin}–{dMax} j</p>
            <span className={inStock ? "text-white/80" : "text-black/60"}>{inStock ? "Déjà à Tana" : "Sur commande"}</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3">
            <ShieldIcon size={18} />
            <p className="font-bold">Contrôle qualité</p>
            <span className="text-black/60">photo avant envoi</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3">
            <PinIcon size={18} />
            <p className="font-bold">Suivi</p>
            <span className="text-black/60">en ligne</span>
          </div>
        </div>
        <div className="mt-6">
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
              <WhatsAppOrder
                whatsapp={settings.whatsapp}
                name={product.name}
                reference={product.ref ?? ""}
                price={formatAr(price)}
                url={`${siteUrl()}/produit/${product.id}`}
                sizes={product.sizes}
              />
              <StickyBuyBar price={formatAr(price)} label={product.name} />
            </>
          )}
        </div>
        {product.description && <p className="mt-8 whitespace-pre-line text-black/80">{product.description}</p>}
        <section className="mt-8 border-t border-black/10 pt-5">
          <h2 className="font-display text-xl">Les détails de ta paire</h2>
          <dl className="mt-3 space-y-2 text-sm text-ink/75">
            {brand && <div><dt className="inline font-semibold">Marque : </dt><dd className="inline">{brand}</dd></div>}
            {product.ref && <div><dt className="inline font-semibold">Référence : </dt><dd className="inline">{product.ref}</dd></div>}
            {product.sizes.length > 0 && <div><dt className="inline font-semibold">Pointures EU : </dt><dd className="inline">{product.sizes.join(", ")}</dd></div>}
            <div><dt className="inline font-semibold">Disponibilité : </dt><dd className="inline">{soldOut ? "Épuisé" : inStock ? "Déjà en stock à Antananarivo" : "Sur commande"}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-ink/75">Besoin de confirmer ta pointure ou la livraison ? <Link href="/contact" className="underline">Contacte la boutique</Link>. <Link href="/cgv" className="underline">Conditions de vente et d’échange</Link>.</p>
        </section>
      </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-16" aria-labelledby="similar-title">
          <div className="flex items-end justify-between gap-4">
            <h2 id="similar-title" className="font-display text-[clamp(1.25rem,calc((100vw_-_108px)/10),1.875rem)] sm:text-4xl">Dans la même catégorie</h2>
            <Link href={categoryPath(product.category)} className="shrink-0 py-2 text-sm font-semibold whitespace-nowrap underline">Tout voir</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {similar.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
