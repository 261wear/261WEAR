import Link from "next/link";
import { FreshBadge } from "@/components/ProductBadges";
import { Highlight } from "@/components/Highlight";
import { Img } from "@/components/ui/Img";
import { LinkPending } from "@/components/ui/LinkPending";
import { formatAr } from "@/lib/pricing";
import { freshness, isProductStatus, PRODUCT_STATUSES } from "@/lib/product-status";
import { priceIssues, productIssues } from "@/lib/product-rules";
import { listProducts } from "@/lib/products";
import { scoreFields, tokenize } from "@/lib/search";
import { getSettings } from "@/lib/settings";
import { StatusSelect } from "./StatusSelect";

export default async function AdminProductsPage(props: PageProps<"/admin/produits">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const statut = typeof sp.statut === "string" && isProductStatus(sp.statut) ? sp.statut : "";
  const photo = sp.photo === "sans";
  const [all, settings] = await Promise.all([listProducts({ onlyActive: false }), getSettings()]);

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
    .filter((x) => x.score > 0)
    .sort((a, b) => (tokens.length ? b.score - a.score : 0));
  const counts = Object.fromEntries(PRODUCT_STATUSES.map((s) => [s.id, matched.filter((x) => x.p.status === s.id).length]));
  const noPhoto = matched.filter((x) => !x.p.images.length).length;
  const products = matched.map((x) => x.p).filter((p) => (!statut || p.status === statut) && (!photo || !p.images.length));

  const link = (changes: Record<string, string>) => {
    const params = new URLSearchParams({ ...(q && { q }), ...(statut && { statut }), ...(photo && { photo: "sans" }), ...changes });
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

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {tab(!statut && !photo, link({ statut: "", photo: "" }), "Tous", matched.length)}
        {PRODUCT_STATUSES.map((s) => tab(statut === s.id, link({ statut: s.id, photo: "" }), s.short, counts[s.id]))}
        {noPhoto > 0 && tab(photo, link({ photo: photo ? "" : "sans", statut: "" }), "⚠ Sans photo", noPhoto)}
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs text-muted uppercase">
            <tr>
              <th className="p-3">Produit</th>
              <th className="p-3">Base de prix</th>
              <th className="p-3">Coût de revient</th>
              <th className="p-3">Prix de vente</th>
              <th className="p-3">Marge</th>
              <th className="p-3">Statut</th>
              <th className="p-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="p-3">
                  <Link href={`/admin/produits/${p.id}`} className="flex items-center gap-3">
                    {p.images[0] ? <Img src={p.images[0]} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <span className="h-12 w-12 rounded-lg bg-paper" />}
                    <span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold underline"><Highlight text={p.name} query={q} /></span>
                        <FreshBadge fresh={freshness(p, settings.badgeDays)} className="!text-[10px]" />
                      </span>
                      <span className="block text-xs text-muted">
                        {[p.ref, p.category, p.sizes.join(", ")].filter(Boolean).join(" · ")}
                        {!p.images.length && <span className="ml-1 font-semibold text-amber-700">· sans photo</span>}
                        {(() => {
                          const issues = [...productIssues(p), ...priceIssues(p, settings)];
                          return issues.length > 0 && <span className="block font-semibold text-red-700">⚠ à compléter : {issues.join(" · ")}</span>;
                        })()}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="p-3 text-xs whitespace-nowrap">
                  {p.pricing.basis === "ar" ? (
                    <span title="Disponible de suite : prix d'achat à Tana">Achat {formatAr(p.cost_ar!)}</span>
                  ) : (
                    <span title="Sur commande : prix fournisseur + transport">{p.price_rmb} ¥</span>
                  )}
                </td>
                <td className="p-3">{formatAr(p.pricing.cost)}</td>
                <td className="p-3 font-semibold">
                  {formatAr(p.pricing.price)}
                  {p.pricing.overridden && <span className="ml-1 text-xs text-amber-700">(forcé)</span>}
                </td>
                <td className={`p-3 ${p.pricing.profit > 0 ? "text-green-700" : "text-red-700"}`}>{formatAr(p.pricing.profit)}</td>
                <td className="p-3"><StatusSelect id={p.id} status={p.status} name={p.name} /></td>
                <td className="p-3">
                  {p.images.length > 0 && (
                    <Link href={`/admin/facebook?produits=${p.id}`} className="text-xs font-semibold whitespace-nowrap text-[#1877F2] hover:underline">
                      Facebook →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {!products.length && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted">
                  {all.length ? "Aucun produit ne correspond." : "Aucun produit. Ajoute ton premier modèle."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
