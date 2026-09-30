import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { listSupplierOptions } from "@/lib/suppliers";
import { ProductForm } from "../ProductForm";

export default async function EditProductPage(props: PageProps<"/admin/produits/[id]">) {
  const [product, settings, suppliers] = await Promise.all([
    getProduct(Number((await props.params).id)),
    getSettings(),
    listSupplierOptions(),
  ]);
  if (!product) notFound();
  const { pricing, ...data } = product;
  void pricing;
  return (
    <>
      <Link href="/admin/produits" className="text-sm text-muted hover:text-ink">← Produits</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">{product.name}</h1>
        {product.active && <Link href={`/produit/${product.id}`} target="_blank" className="text-sm underline">Voir sur le site ↗</Link>}
      </div>
      <ProductForm product={data} settings={settings} suppliers={suppliers} />
    </>
  );
}
