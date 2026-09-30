import Link from "next/link";
import { toggleProduct } from "@/app/admin/actions";
import { SubmitButton } from "@/components/ui/Button";
import { Img } from "@/components/ui/Img";
import { formatAr } from "@/lib/pricing";
import { listProducts } from "@/lib/products";

export default async function AdminProductsPage() {
  const products = await listProducts({ onlyActive: false });
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Produits</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/produits/import" className="btn-ghost">Import en masse</Link>
          <Link href="/admin/produits/nouveau" className="btn-dark">+ Ajouter un produit</Link>
        </div>
      </div>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs text-muted uppercase">
            <tr>
              <th className="p-3">Produit</th>
              <th className="p-3">Prix RMB</th>
              <th className="p-3">Coût de revient</th>
              <th className="p-3">Prix de vente</th>
              <th className="p-3">Marge</th>
              <th className="p-3">En ligne</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="p-3">
                  <Link href={`/admin/produits/${p.id}`} className="flex items-center gap-3">
                    {p.images[0] ? (
                      <Img src={p.images[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <span className="h-12 w-12 rounded-lg bg-paper" />
                    )}
                    <span>
                      <span className="font-semibold underline">{p.name}</span>
                      <span className="block text-xs text-muted">
                        {[p.ref, p.category, p.sizes.join(", ")].filter(Boolean).join(" · ")}
                        {!p.images.length && <span className="ml-1 font-semibold text-amber-700">· sans photo</span>}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="p-3">{p.price_rmb} ¥</td>
                <td className="p-3">{formatAr(p.pricing.cost)}</td>
                <td className="p-3 font-semibold">
                  {formatAr(p.pricing.price)}
                  {p.pricing.overridden && <span className="ml-1 text-xs text-amber-700">(forcé)</span>}
                </td>
                <td className={`p-3 ${p.pricing.profit > 0 ? "text-green-700" : "text-red-700"}`}>{formatAr(p.pricing.profit)}</td>
                <td className="p-3">
                  <form action={toggleProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton
                      aria-label={p.active ? `Masquer ${p.name}` : `Mettre en ligne ${p.name}`}
                      className={`inline-flex min-w-24 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60 ${p.active ? "bg-green-100 text-green-800" : "bg-black/5 text-muted"}`}
                    >
                      {p.active ? "En ligne" : "Masqué"}
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
            {!products.length && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted">Aucun produit. Ajoute ton premier modèle.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
