"use client";

import { useFormAction } from "@/components/useFormAction";
import { useState } from "react";
import { createManualOrder } from "@/app/admin/actions";

type Option = { id: number; name: string; price: number; sizes: string[] };

export function ManualOrderForm({ products }: { products: Option[] }) {
  const [state, onSubmit, pending] = useFormAction(createManualOrder, undefined);
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const product = products.find((p) => p.id === productId);
  return (
    <form onSubmit={onSubmit} className="card max-w-xl space-y-4 p-6">
      <div>
        <label className="label" htmlFor="productId">Produit</label>
        <select id="productId" name="productId" className="input" value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="size">Pointure</label>
          {product?.sizes.length ? (
            <select id="size" name="size" className="input" key={productId}>
              {product.sizes.map((s) => <option key={s}>{s}</option>)}
            </select>
          ) : (
            <input id="size" name="size" className="input" />
          )}
        </div>
        <div>
          <label className="label" htmlFor="price">Prix (Ar)</label>
          <input id="price" name="price" className="input" inputMode="numeric" key={productId} defaultValue={product?.price} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nom du client</label>
          <input id="name" name="name" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="phone">Téléphone</label>
          <input id="phone" name="phone" className="input" inputMode="tel" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="address">Adresse de livraison</label>
        <input id="address" name="address" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="note">Note</label>
        <textarea id="note" name="note" className="input" rows={2} />
      </div>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-dark" disabled={pending || !products.length}>Créer la commande</button>
    </form>
  );
}
