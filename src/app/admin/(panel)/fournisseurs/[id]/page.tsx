import Link from "next/link";
import { notFound } from "next/navigation";
import { removeSupplier } from "@/app/admin/actions";
import { SubmitButton } from "@/components/ui/Button";
import { Img } from "@/components/ui/Img";
import { formatAr } from "@/lib/pricing";
import { listProducts } from "@/lib/products";
import { getSupplier } from "@/lib/suppliers";
import { SupplierForm } from "../SupplierForm";

export default async function SupplierPage(props: PageProps<"/admin/fournisseurs/[id]">) {
  const supplier = await getSupplier(Number((await props.params).id));
  if (!supplier) notFound();
  const products = (await listProducts({ onlyActive: false })).filter((p) => p.supplier_id === supplier.id);
  return (
    <>
      <Link href="/admin/fournisseurs" className="text-sm text-muted hover:text-ink">← Fournisseurs</Link>
      <h1 className="font-display mt-2 mb-6 text-3xl">{supplier.name}</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <SupplierForm supplier={supplier} />
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold">Produits de ce fournisseur ({products.length})</h2>
            <ul className="mt-3 divide-y divide-black/5">
              {products.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/produits/${p.id}`} className="flex items-center gap-3 py-2 hover:bg-paper">
                    {p.images[0] ? <Img src={p.images[0]} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="h-10 w-10 rounded-md bg-paper" />}
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="text-xs text-muted">
                        {[p.ref, p.supplier_ref && `réf. fourn. ${p.supplier_ref}`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="text-right text-xs">
                      {p.price_rmb} ¥<span className="block text-muted">{formatAr(p.pricing.price)}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {!products.length && <li className="py-3 text-sm text-muted">Aucun produit. Choisis ce fournisseur dans une fiche produit ou via l&apos;import.</li>}
            </ul>
          </div>
          <form action={removeSupplier}>
            <input type="hidden" name="id" value={supplier.id} />
            <SubmitButton pendingLabel="Suppression…" className="inline-flex w-full items-center justify-center gap-2 text-sm text-red-700 hover:underline disabled:opacity-50">
              Supprimer le fournisseur (les produits sont conservés)
            </SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}
