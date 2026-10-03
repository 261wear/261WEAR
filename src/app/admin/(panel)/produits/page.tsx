import Link from "next/link";
import { LinkPending } from "@/components/ui/LinkPending";
import { formatAr } from "@/lib/pricing";
import { freshness, isProductStatus, PRODUCT_STATUSES } from "@/lib/product-status";
import { priceIssues, productIssues } from "@/lib/product-rules";
import { listProductsLight } from "@/lib/products";
import { scoreFields, tokenize } from "@/lib/search";
import { getSettings } from "@/lib/settings";
import { Pagination } from "@/components/Pagination";
import { isDbId } from "@/lib/orders-shared";
import { pageParam, paginate } from "@/lib/pagination";
import { ProductTable, type Row } from "./ProductTable";

const PAGE_SIZE = 50;

export default async function AdminProductsPage(props: PageProps<"/admin/produits">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const statut = typeof sp.statut === "string" && isProductStatus(sp.statut) ? sp.statut : "";
  const photo = sp.photo === "sans";
  const supplierId = isDbId(Number(sp.fournisseur)) ? Number(sp.fournisseur) : null;
  const [all, settings] = await Promise.all([listProductsLight(), getSettings()]);

  const tokens = tokenize(q);
  const matched = all
    .map((p) => ({
      p,
      score: scoreFields(tokens, [
        { text: p.name, weight: 3 },
        { text: p.ref ?? "", weight: 4, exact: true },
        { text: p.supplier_ref, weight: 4, exact: true },
        { text: p.category, weight: 2 },
      ]),
    }))
    .filter((x) => x.score > 0 && (!supplierId || x.p.supplier_id === supplierId))
    .sort((a, b) => (tokens.length ? b.score - a.score : 0));
  const counts = Object.fromEntries(PRODUCT_STATUSES.map((s) => [s.id, matched.filter((x) => x.p.status === s.id).length]));
  const noPhoto = matched.filter((x) => !x.p.photoCount).length;
  const products = matched.map((x) => x.p).filter((p) => (!statut || p.status === statut) && (!photo || !p.photoCount));
  const pageData = paginate(products, pageParam(sp.page), PAGE_SIZE);
  const rows: Row[] = pageData.items.map((p) => ({
    id: p.id,
    name: p.name,
    meta: [p.ref, p.category, p.sizes.join(", ")].filter(Boolean).join(" · "),
    image: p.images[0] ?? null,
    photos: p.photoCount,
    basis: p.pricing.basis === "ar" ? `Achat ${formatAr(p.cost_ar!)}` : `${p.price_rmb} ¥`,
    cost: p.pricing.cost,
    price: p.pricing.price,
    profit: p.pricing.profit,
    overridden: p.pricing.overridden,
    status: p.status,
    fresh: freshness(p, settings.badgeDays),
    issues: [...productIssues(p), ...priceIssues(p, settings)],
  }));

  const link = (changes: Record<string, string>) => {
    const params = new URLSearchParams({
      ...(q && { q }),
      ...(statut && { statut }),
      ...(photo && { photo: "sans" }),
      ...(supplierId && { fournisseur: String(supplierId) }),
      ...changes,
    });
    for (const [k, v] of [...params.entries()]) if (!v) params.delete(k);
    const s = params.toString();
    return `/admin/produits${s ? `?${s}` : ""}`;
  };
  const tab = (active: boolean, to: string, label: string, n: number) => (
    <Link key={label} href={to} className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${active ? "bg-ink text-white" : "bg-white hover:bg-black/5"}`}>
      {label} <span className="opacity-60">{n}</span> <LinkPending />
    </Link>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Produits</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/produits/import" className="btn-ghost">Import en masse</Link>
          <Link href="/admin/produits/nouveau" className="btn-dark">+ Ajouter un produit</Link>
        </div>
      </div>

      <form action="/admin/produits" role="search" className="mt-5 flex gap-2">
        {statut && <input type="hidden" name="statut" value={statut} />}
        <input name="q" type="search" defaultValue={q} placeholder="Rechercher : nom, réf., réf. fournisseur, catégorie…" aria-label="Rechercher un produit" className="input max-w-lg" />
        <button className="btn-dark">Rechercher</button>
        {q && <Link href={link({ q: "" })} className="btn-ghost">Effacer</Link>}
      </form>

      {supplierId && (
        <p className="mt-3 text-sm">
          Filtré sur un fournisseur · <Link href={link({ fournisseur: "" })} className="underline">Retirer le filtre</Link>
        </p>
      )}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {tab(!statut && !photo, link({ statut: "", photo: "" }), "Tous", matched.length)}
        {PRODUCT_STATUSES.map((s) => tab(statut === s.id, link({ statut: s.id, photo: "" }), s.short, counts[s.id]))}
        {noPhoto > 0 && tab(photo, link({ photo: photo ? "" : "sans", statut: "" }), "⚠ Sans photo", noPhoto)}
      </div>

      {/* Always mounted: after a bulk action empties the filtered list, its result message stays visible. */}
      <ProductTable
        rows={rows}
        allIds={products.map((p) => p.id)}
        query={q}
        emptyText={all.length ? "Aucun produit ne correspond." : "Aucun produit. Ajoute ton premier modèle."}
      />
      {products.length > 0 && (
        <>
          <p className="mt-3 text-center text-xs text-muted">
            {pageData.from}–{pageData.to} sur {pageData.total} produit{pageData.total > 1 ? "s" : ""}
          </p>
          <Pagination page={pageData.page} pageCount={pageData.pageCount} hrefFor={(n) => link({ page: n > 1 ? String(n) : "" })} label="Pages de produits" />
        </>
      )}
    </>
  );
}
