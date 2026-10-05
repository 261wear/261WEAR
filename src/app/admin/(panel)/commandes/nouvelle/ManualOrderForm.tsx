"use client";

import { useFormAction } from "@/components/useFormAction";
import { useMemo, useState } from "react";
import { createManualOrder } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Img } from "@/components/ui/Img";
import { thumbUrl } from "@/lib/images";
import { formatAr } from "@/lib/pricing";
import { scoreFields, tokenize } from "@/lib/search";

type Option = { id: number; name: string; ref: string; image: string | null; price: number; sizes: string[] };

export function ManualOrderForm({ products }: { products: Option[] }) {
  const [state, onSubmit, pending, formAction] = useFormAction(createManualOrder, undefined);
  const [productId, setProductId] = useState(0);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const product = products.find((p) => p.id === productId);
  // Search by name or reference: thousands of products do not fit in a dropdown.
  const results = useMemo(() => {
    const tokens = tokenize(q);
    if (!tokens.length) return [];
    return products
      .map((p) => ({ p, score: scoreFields(tokens, [{ text: p.name, weight: 3 }, { text: p.ref, weight: 4, exact: true }]) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.p);
  }, [q, products]);
  const pick = (p: Option) => {
    setProductId(p.id);
    setQ("");
  };
  return (
    <form action={formAction} onSubmit={onSubmit} className="card max-w-xl space-y-4 p-6">
      <div>
        <label className="label" htmlFor="product-search">Produit</label>
        <input type="hidden" name="productId" value={productId || ""} />
        {product ? (
          <div className="flex items-center gap-3 rounded-lg border border-ink bg-white p-2">
            {product.image ? <Img src={thumbUrl(product.image)} fallback={product.image} alt="" className="h-12 w-12 rounded-md object-cover" /> : <span className="h-12 w-12 rounded-md bg-paper" />}
            <span className="min-w-0 flex-1">
              <b className="block truncate">{product.name}</b>
              <span className="text-xs text-muted">{[product.ref, formatAr(product.price)].filter(Boolean).join(" · ")}</span>
            </span>
            <button type="button" onClick={() => setProductId(0)} className="btn-ghost px-3 py-2">Changer</button>
          </div>
        ) : (
          <div className="relative">
            <input
              id="product-search"
              type="search"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="product-results"
              aria-activedescendant={results[cursor] ? `product-opt-${results[cursor].id}` : undefined}
              autoComplete="off"
              autoFocus
              value={q}
              onChange={(e) => { setQ(e.target.value); setCursor(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
                if (e.key === "Enter" && results[cursor]) { e.preventDefault(); pick(results[cursor]); }
              }}
              placeholder="Nom ou référence du modèle…"
              className="input"
            />
            {results.length > 0 && (
              <ul id="product-results" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-black/10 bg-white shadow-lg">
                {results.map((p, i) => (
                  <li
                    key={p.id}
                    id={`product-opt-${p.id}`}
                    role="option"
                    aria-selected={i === cursor}
                    onMouseDown={(e) => { e.preventDefault(); pick(p); }}
                    className={`flex cursor-pointer items-center gap-3 p-2 ${i === cursor ? "bg-accent/30" : "hover:bg-paper"}`}
                  >
                    {p.image ? <Img src={thumbUrl(p.image)} fallback={p.image} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="h-10 w-10 rounded-md bg-paper" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
                      <span className="text-xs text-muted">{[p.ref, formatAr(p.price)].filter(Boolean).join(" · ")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {q.trim() && !results.length && <p className="mt-1 text-xs text-muted">Aucun produit trouvé.</p>}
          </div>
        )}
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
      <FormMessage error={state?.error} />
      <Button type="submit" pending={pending} pendingLabel="Création…" disabled={!product}>Créer la commande</Button>
    </form>
  );
}
