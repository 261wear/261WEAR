import Link from "next/link";
import { listProductsLight } from "@/lib/products";
import { ManualOrderForm } from "./ManualOrderForm";

export default async function NewOrderPage() {
  const products = await listProductsLight();
  return (
    <>
      <Link href="/admin" className="text-sm text-muted hover:text-ink">← Commandes</Link>
      <h1 className="font-display mt-2 mb-2 text-3xl">Commande manuelle</h1>
      <p className="mb-6 text-sm text-muted">Pour une commande reçue sur Facebook, Instagram ou WhatsApp. Le client pourra la suivre sur le site.</p>
      {products.length ? (
        <ManualOrderForm products={products.map((p) => ({ id: p.id, name: p.name, ref: p.ref ?? "", image: p.images[0] ?? null, price: p.pricing.price, sizes: p.sizes }))} />
      ) : (
        <p className="card p-6">Ajoute d&apos;abord un produit.</p>
      )}
    </>
  );
}
