import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { shopProducts, shopSettings } from "@/lib/catalog";
import { toCard } from "@/lib/card";
import { CATALOG_PAGE_SIZE, catalogCategories, catalogPagePath, categorySlug, pageNumber } from "@/lib/shop-seo";
import { jsonLd, pageUrls, siteUrl } from "@/lib/site";
import { ProductCard } from "./ProductCard";

async function readCatalog(category?: string, rawPage = "1") {
  const page = pageNumber(rawPage);
  if (!page) notFound();
  const [all, settings] = await Promise.all([shopProducts(), shopSettings()]);
  const categories = catalogCategories(all);
  const current = category ? categories.find((item) => item.slug === category) : undefined;
  if (category && !current) notFound();
  const products = current ? all.filter((product) => categorySlug(product.category) === current.slug) : all;
  const pages = Math.max(1, Math.ceil(products.length / CATALOG_PAGE_SIZE));
  if (page > pages) notFound();
  const base = current?.path ?? "/chaussures";
  return { categories, current, products, page, pages, base, settings };
}

export async function catalogMetadata(category?: string, rawPage = "1"): Promise<Metadata> {
  const { current, page, base } = await readCatalog(category, rawPage);
  const subject = current?.name ?? "Chaussures";
  return {
    ...pageUrls(catalogPagePath(base, page)),
    title: `${subject} à Antananarivo${page > 1 ? ` — page ${page}` : ""}`,
    description: `${subject} chez 261° WEAR, boutique en ligne à Tana, Madagascar. Prix en ariary, pointures et disponibilité par modèle. Commande sur WhatsApp.${page > 1 ? ` Page ${page}.` : ""}`,
  };
}

export async function ShopCatalog({ category, rawPage = "1", paginated = false }: { category?: string; rawPage?: string; paginated?: boolean }) {
  const { categories, current, products, page, pages, base, settings } = await readCatalog(category, rawPage);
  if (paginated && page === 1) permanentRedirect(base);
  const start = (page - 1) * CATALOG_PAGE_SIZE;
  const shown = products.slice(start, start + CATALOG_PAGE_SIZE);
  const title = current ? `${current.name} à Antananarivo` : "Chaussures en ligne à Antananarivo";
  const url = siteUrl();
  const breadcrumbs = [{ name: "Accueil", path: "/" }, { name: "Chaussures", path: "/chaussures" },
    ...(current ? [{ name: current.name, path: current.path }] : []),
    ...(page > 1 ? [{ name: `Page ${page}`, path: catalogPagePath(base, page) }] : [])];
  const structured = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumbs.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${url}${item.path}` })) },
    // Schema.org counts the entire list when its items span multiple pages.
    { "@context": "https://schema.org", "@type": "ItemList", name: title, numberOfItems: products.length,
      itemListElement: shown.map((product, i) => ({ "@type": "ListItem", position: start + i + 1, name: product.name, url: `${url}/produit/${product.id}` })) },
  ];
  // A compact window keeps navigation small even with thousands of products.
  const numbered = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <nav aria-label="Fil d’Ariane" className="flex flex-wrap gap-2 text-sm text-muted">
        {breadcrumbs.map((item, i) => <span key={item.path}>{i > 0 && <span aria-hidden="true" className="mr-2">/</span>}<Link href={item.path} aria-current={i === breadcrumbs.length - 1 ? "page" : undefined} className="inline-block py-2 underline">{item.name}</Link></span>)}
      </nav>
      <h1 className="font-display mt-4 text-4xl leading-tight sm:text-6xl">{title}{page > 1 ? ` — page ${page}` : ""}</h1>
      <p className="mt-4 max-w-3xl text-ink/75">{current ? `Découvre notre sélection ${current.name}. ` : "Découvre les chaussures de 261° WEAR, ta boutique en ligne à Tana, Madagascar. "}Choisis ton modèle et ta pointure, puis commande via WhatsApp. Livraison à Antananarivo en {settings.deliveryMinDays} à {settings.deliveryMaxDays} jours sur commande, ou en {settings.stockDeliveryMinDays} à {settings.stockDeliveryMaxDays} jours pour les paires déjà en stock.</p>
      <nav aria-label="Catégories de chaussures" className="mt-6 flex flex-wrap gap-2">
        <Link href="/chaussures" className="rounded-full border border-black/15 px-4 py-2 text-sm" aria-current={!current ? "page" : undefined}>Toutes les chaussures</Link>
        {categories.map((item) => <Link key={item.slug} href={item.path} aria-current={item.slug === current?.slug ? "page" : undefined} className={`rounded-full border border-black/15 px-4 py-2 text-sm ${item.slug === current?.slug ? "bg-ink text-white" : ""}`}>{item.name} ({item.count})</Link>)}
      </nav>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">{products.length} modèle{products.length > 1 ? "s" : ""}</h2>
        <Link href={current ? `/recherche?cat=${encodeURIComponent(current.name)}` : "/recherche"} className="py-2 text-sm underline">Filtrer par pointure, prix ou disponibilité</Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((product, i) => <ProductCard key={product.id} product={toCard(product)} priority={i === 0} />)}
      </div>
      {!products.length && <p className="card mt-6 p-6">Le prochain catalogue arrive bientôt. <Link href="/contact" className="underline">Contacte-nous pour chercher une paire.</Link></p>}
      {pages > 1 && <nav aria-label="Pagination du catalogue" className="mt-10 flex flex-wrap items-center justify-center gap-2">
        {page > 1 && <Link rel="prev" href={catalogPagePath(base, page - 1)} className="rounded-full border border-black/15 px-4 py-3 text-sm">Précédente</Link>}
        {numbered.map((n) => <Link key={n} href={catalogPagePath(base, n)} aria-label={`Page ${n}`} aria-current={page === n ? "page" : undefined} className={`rounded-full border border-black/15 px-4 py-3 text-sm ${n === page ? "bg-ink text-white" : ""}`}>{n}</Link>)}
        {page < pages && <Link rel="next" href={catalogPagePath(base, page + 1)} className="rounded-full border border-black/15 px-4 py-3 text-sm">Suivante</Link>}
      </nav>}
      <p className="mt-8 text-sm text-muted">Une question sur une paire ? <Link href="/contact" className="underline">Contacte la boutique</Link> ou consulte <Link href="/faq" className="underline">les questions fréquentes</Link>.</p>
    </div>
  );
}
