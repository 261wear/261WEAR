"use client";

import { useFormAction } from "@/components/useFormAction";
import { useState } from "react";
import { removeProduct, saveProduct } from "@/app/admin/actions";
import { PendingTiles, UploadTile, useUploads } from "@/components/admin/UploadTile";
import { Button, SubmitButton } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Img } from "@/components/ui/Img";
import { computePrice, formatAr, type PricingSettings } from "@/lib/pricing";
import type { Product } from "@/lib/products";

const CATEGORIES = ["Sneakers", "Running", "Basketball", "Chaussures de ville", "Boots", "Mocassins", "Sandales"];

function parse(v: string): number | null {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return v.trim() && Number.isFinite(n) ? n : null;
}

export function ProductForm({ product, settings }: { product?: Product; settings: PricingSettings }) {
  const [state, onSubmit, pending] = useFormAction(saveProduct, undefined);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [imageUrl, setImageUrl] = useState("");
  const uploads = useUploads("products", (url) => setImages((prev) => [...prev, url]));
  const [rmb, setRmb] = useState(product ? String(product.price_rmb) : "");
  const [weight, setWeight] = useState(product?.weight_kg != null ? String(product.weight_kg) : "");
  const [margin, setMargin] = useState(product?.margin_pct != null ? String(product.margin_pct) : "");
  const [override, setOverride] = useState(product?.price_override != null ? String(product.price_override) : "");

  const rmbValue = parse(rmb);
  const preview =
    rmbValue && rmbValue > 0
      ? computePrice(settings, {
          price_rmb: rmbValue,
          weight_kg: parse(weight),
          margin_pct: parse(margin),
          price_override: parse(override),
        })
      : null;

  function move(i: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form id="product-form" onSubmit={onSubmit} className="space-y-6">
        {product && <input type="hidden" name="id" value={product.id} />}
        <input type="hidden" name="images" value={JSON.stringify(images)} />

        <div className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="name">Nom du modèle</label>
            <input id="name" name="name" className="input" defaultValue={product?.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="category">Catégorie</label>
              <input id="category" name="category" className="input" list="categories" defaultValue={product?.category ?? "Sneakers"} />
              <datalist id="categories">
                {CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="label" htmlFor="sizes">Pointures disponibles</label>
              <input id="sizes" name="sizes" className="input" defaultValue={product?.sizes.join(", ") ?? "39, 40, 41, 42, 43, 44"} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={4} className="input" defaultValue={product?.description} placeholder="Matières, semelle, points forts…" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4" />
            Afficher sur le site
          </label>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Photos</h2>
          <p className="mt-1 text-xs text-muted">Photos des fournisseurs (WeChat) ou tes propres photos. La première est la photo principale.</p>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((src, i) => (
              <div key={src} className="relative">
                <Img src={src} alt="" className="aspect-square w-full rounded-lg border border-black/10 object-cover" />
                <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  <button type="button" onClick={() => move(i, -1)} className="rounded bg-black/70 px-1.5 text-xs text-white">←</button>
                  <button type="button" onClick={() => setImages(images.filter((u) => u !== src))} className="rounded bg-red-600 px-1.5 text-xs text-white">✕</button>
                  <button type="button" onClick={() => move(i, 1)} className="rounded bg-black/70 px-1.5 text-xs text-white">→</button>
                </div>
              </div>
            ))}
            <PendingTiles count={uploads.remaining} className="aspect-square" />
            <UploadTile label="Ajouter" className="aspect-square" pending={uploads.pending} progress={uploads.progress} onFiles={uploads.upload} />
          </div>
          <div className="mt-3 flex gap-2">
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="…ou coller l'URL d'une image" className="input" />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                if (/^https?:\/\//.test(imageUrl.trim())) setImages([...images, imageUrl.trim()]);
                setImageUrl("");
              }}
            >
              Ajouter
            </button>
          </div>
          {uploads.error && <div className="mt-2"><FormMessage error={uploads.error} /></div>}
        </div>

        <FormMessage error={state?.error} />
        <Button
          type="submit"
          pending={pending}
          pendingLabel="Enregistrement…"
          disabled={uploads.pending}
          title={uploads.pending ? "Attends la fin de l'envoi des photos" : undefined}
          className="btn-dark w-full py-4"
        >
          {uploads.pending ? "Envoi des photos en cours…" : product ? "Enregistrer les modifications" : "Ajouter le produit"}
        </Button>
      </form>

      <aside className="space-y-4">
        <div className="card space-y-4 p-5 lg:sticky lg:top-4">
          <h2 className="font-semibold">Prix</h2>
          <div>
            <label className="label" htmlFor="price_rmb">Prix fournisseur (RMB ¥)</label>
            <input form="product-form" id="price_rmb" name="price_rmb" className="input text-lg font-semibold" inputMode="decimal" value={rmb} onChange={(e) => setRmb(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="weight_kg">Poids (kg)</label>
              <input form="product-form" id="weight_kg" name="weight_kg" className="input" inputMode="decimal" placeholder={String(settings.defaultWeightKg)} value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="margin_pct">Marge (%)</label>
              <input form="product-form" id="margin_pct" name="margin_pct" className="input" inputMode="decimal" placeholder={String(settings.marginPct)} value={margin} onChange={(e) => setMargin(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="price_override">Forcer un prix de vente (Ar)</label>
            <input form="product-form" id="price_override" name="price_override" className="input" inputMode="numeric" placeholder="Vide = calcul automatique" value={override} onChange={(e) => setOverride(e.target.value)} />
          </div>

          {preview ? (
            <dl className="space-y-1.5 rounded-xl bg-paper p-4 text-sm">
              <div className="flex justify-between"><dt>Produit ({rmbValue} ¥ × {settings.rmbRate})</dt><dd>{formatAr(preview.productCost)}</dd></div>
              <div className="flex justify-between"><dt>Transport ({preview.weightKg} kg)</dt><dd>{formatAr(preview.transport)}</dd></div>
              <div className="flex justify-between"><dt>Frais fixes</dt><dd>{formatAr(preview.fixedFees)}</dd></div>
              <div className="flex justify-between border-t border-black/10 pt-1.5 font-semibold"><dt>Coût de revient</dt><dd>{formatAr(preview.cost)}</dd></div>
              <div className="flex justify-between"><dt>Marge {preview.overridden ? "" : `(${preview.marginPct} %)`}</dt><dd className={preview.profit > 0 ? "text-green-700" : "text-red-700"}>{formatAr(preview.profit)}</dd></div>
              <div className="flex justify-between border-t border-black/10 pt-2 text-lg font-bold"><dt>Prix de vente</dt><dd>{formatAr(preview.price)}</dd></div>
            </dl>
          ) : (
            <p className="rounded-xl bg-paper p-4 text-sm text-muted">Saisis le prix en RMB pour voir le calcul.</p>
          )}
          <p className="text-xs text-muted">Si tu changes le taux ou le transport dans « Prix & paramètres », tous les prix se mettent à jour.</p>
        </div>

        {product && (
          <form action={removeProduct} onSubmit={(e) => { if (!confirm("Supprimer ce produit ?")) e.preventDefault(); }}>
            <input type="hidden" name="id" value={product.id} />
            <SubmitButton pendingLabel="Suppression…" className="inline-flex w-full items-center justify-center gap-2 text-sm text-red-700 hover:underline disabled:opacity-50">Supprimer le produit</SubmitButton>
          </form>
        )}
      </aside>
    </div>
  );
}
