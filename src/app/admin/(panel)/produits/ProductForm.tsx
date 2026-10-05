"use client";

import { thumbUrl } from "@/lib/images";
import { useFormAction } from "@/components/useFormAction";
import { useState } from "react";
import { removeProduct, saveProduct } from "@/app/admin/actions";
import { PendingTiles, UploadTile, useUploads } from "@/components/admin/UploadTile";
import { Button, SubmitButton } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Img } from "@/components/ui/Img";
import { computePrice, formatAr, type PricingSettings } from "@/lib/pricing";
import { isAllowedImageUrl, priceIssues, productIssues, productWarnings } from "@/lib/product-rules";
import { PRODUCT_STATUSES, type ProductStatus } from "@/lib/product-status";
import type { Product } from "@/lib/products";

const STATUS_HELP: Record<ProductStatus, string> = {
  sur_commande: "Visible, commandé en Chine (délai normal)",
  en_stock: "Visible, déjà à Tana : livraison rapide",
  epuise: "Visible mais ne peut plus être commandé",
  brouillon: "Invisible sur le site",
};

const CATEGORIES = ["Sneakers", "Running", "Basketball", "Chaussures de ville", "Boots", "Mocassins", "Sandales"];

function parse(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

// Ariary: "210 000", "210.000" → 210000.
function parseAr(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(/[.,]\d{1,2}$/, "").replace(/[\s.,]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

export function ProductForm({
  product,
  settings,
  suppliers,
}: {
  product?: Product;
  settings: PricingSettings;
  suppliers: { id: number; name: string }[];
}) {
  const [state, onSubmit, pending, formAction] = useFormAction(saveProduct, undefined);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [imageUrl, setImageUrl] = useState("");
  const uploads = useUploads("products", (url) => setImages((prev) => [...prev, url]));
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "sur_commande");
  const [rmb, setRmb] = useState(product?.price_rmb != null ? String(product.price_rmb) : "");
  const [costAr, setCostAr] = useState(product?.cost_ar != null ? String(product.cost_ar) : "");
  const [weight, setWeight] = useState(product?.weight_kg != null ? String(product.weight_kg) : "");
  const [margin, setMargin] = useState(product?.margin_pct != null ? String(product.margin_pct) : "");
  const [override, setOverride] = useState(product?.price_override != null ? String(product.price_override) : "");

  const rmbValue = parse(rmb);
  const costValue = parseAr(costAr);
  const core = {
    name: "x", // the name is checked by the browser (required field)
    status,
    price_rmb: rmbValue,
    cost_ar: costValue,
    weight_kg: parse(weight),
    margin_pct: parse(margin),
    price_override: parseAr(override),
    sizes: [],
  };
  const issues = [...productIssues(core), ...priceIssues(core, settings)];
  const preview = issues.length ? null : computePrice(settings, core);
  const warnings = productWarnings(core, settings);
  // The other way to price this product, when both prices are known.
  const weightValue = parse(weight);
  const alt =
    preview && rmbValue != null && costValue != null && weightValue != null
      ? computePrice(settings, { ...core, status: preview.basis === "ar" ? "sur_commande" : "en_stock" })
      : null;
  const needRmb = status === "sur_commande";
  const needAr = status === "en_stock";
  // Same rule as the server: a China price needs the weight, stock in Tana does not.
  const needWeight = needRmb || (status !== "en_stock" && costValue == null && rmbValue != null);

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
      <form id="product-form" action={formAction} onSubmit={onSubmit} className="space-y-6">
        {product && <input type="hidden" name="id" value={product.id} />}
        <input type="hidden" name="images" value={JSON.stringify(images)} />

        <div className="card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div>
              <label className="label" htmlFor="ref">Référence</label>
              <input id="ref" name="ref" className="input uppercase" defaultValue={product?.ref ?? ""} placeholder="AR261" />
            </div>
            <div>
              <label className="label" htmlFor="name">Nom du modèle</label>
              <input id="name" name="name" className="input" defaultValue={product?.name} required />
            </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="supplier_id">Fournisseur</label>
              <select id="supplier_id" name="supplier_id" className="input" defaultValue={product?.supplier_id ?? ""}>
                <option value="">— Aucun —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {!suppliers.length && <p className="mt-1 text-xs text-muted">Ajoute tes fournisseurs dans l&apos;onglet « Fournisseurs ».</p>}
            </div>
            <div>
              <label className="label" htmlFor="supplier_ref">Réf. chez le fournisseur</label>
              <input id="supplier_ref" name="supplier_ref" className="input" defaultValue={product?.supplier_ref} placeholder="Ex. PT-8821" />
            </div>
          </div>
          <fieldset>
            <legend className="label">Statut</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PRODUCT_STATUSES.map((st) => (
                <label key={st.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-black/10 p-3 text-sm has-[:checked]:border-ink has-[:checked]:bg-paper">
                  <input type="radio" name="status" value={st.id} checked={status === st.id} onChange={() => setStatus(st.id)} className="mt-0.5" />
                  <span>
                    <span className="font-semibold">{st.label}</span>
                    <span className="block text-xs text-muted">{STATUS_HELP[st.id]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Photos</h2>
          <p className="mt-1 text-xs text-muted">Photos des fournisseurs (WeChat) ou tes propres photos. La première est la photo principale.</p>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((src, i) => (
              <div key={src} className="relative">
                <Img src={thumbUrl(src)} fallback={src} alt="" className="aspect-square w-full rounded-lg border border-black/10 object-cover" />
                {i === 0 && <span className="absolute top-1.5 left-1.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-ink">Principale</span>}
                <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Déplacer la photo ${i + 1} vers la gauche`} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-sm text-white disabled:invisible">←</button>
                  <button type="button" onClick={() => setImages(images.filter((u) => u !== src))} aria-label={`Retirer la photo ${i + 1}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-sm text-white">✕</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label={`Déplacer la photo ${i + 1} vers la droite`} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-sm text-white disabled:invisible">→</button>
                </div>
              </div>
            ))}
            <PendingTiles count={uploads.remaining} className="aspect-square" />
            <UploadTile label="Ajouter" className="aspect-square" pending={uploads.pending} progress={uploads.progress} onFiles={uploads.upload} />
          </div>
          <div className="mt-3 flex gap-2">
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="…ou coller l'adresse https:// d'une image" className="input" />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                if (isAllowedImageUrl(imageUrl.trim()) && !images.includes(imageUrl.trim())) setImages([...images, imageUrl.trim()]);
                setImageUrl("");
              }}
            >
              Ajouter
            </button>
          </div>
          {uploads.error && <div className="mt-2"><FormMessage error={uploads.error} /></div>}
        </div>

        <FormMessage error={state?.error} />
        {/* Stays in reach at the bottom of the screen on long forms. */}
        <div className="sticky bottom-0 z-10 -mx-4 bg-paper/95 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:px-0">
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
        </div>
      </form>

      <aside className="space-y-4">
        <div className="card space-y-4 p-5 lg:sticky lg:top-20">
          <h2 className="font-semibold">Prix</h2>
          <div>
            <label className="label" htmlFor="price_rmb">
              Prix fournisseur (RMB ¥) {needRmb && <span className="text-red-700">*</span>}
            </label>
            <input form="product-form" id="price_rmb" name="price_rmb" className="input text-lg font-semibold" inputMode="decimal" value={rmb} onChange={(e) => setRmb(e.target.value)} required={needRmb} />
            <p className="mt-1 text-xs text-muted">Pour la vente sur commande (Chine → Tana).</p>
          </div>
          <div>
            <label className="label" htmlFor="cost_ar">
              Prix d&apos;achat à Tana (Ar) {needAr && <span className="text-red-700">*</span>}
            </label>
            <input form="product-form" id="cost_ar" name="cost_ar" className="input text-lg font-semibold" inputMode="numeric" value={costAr} onChange={(e) => setCostAr(e.target.value)} required={needAr} placeholder="Ex. 210000" />
            <p className="mt-1 text-xs text-muted">Pour « Disponible de suite » : prix payé pour la paire déjà à Tana. Aucun frais ajouté, seulement ta marge.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={preview?.basis === "ar" ? "opacity-50" : ""}>
              <label className="label" htmlFor="weight_kg">
                Poids (kg) {needWeight && <span className="text-red-700">*</span>}
              </label>
              <input form="product-form" id="weight_kg" name="weight_kg" className="input" inputMode="decimal" placeholder="Ex. 1,2" value={weight} onChange={(e) => setWeight(e.target.value)} required={needWeight} />
              <p className="mt-1 text-xs text-muted">{needAr ? "Inutile : déjà à Tana." : "Boîte comprise, pour le transport."}</p>
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
            <dl className="space-y-1.5 rounded-xl bg-paper p-4 text-sm" aria-live="polite">
              <div className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">
                {preview.basis === "ar" ? "Calcul « Disponible de suite » (achat en Ar)" : "Calcul « Sur commande » (RMB + transport)"}
              </div>
              {preview.basis === "ar" ? (
                <div className="flex justify-between"><dt>Achat à Tana</dt><dd>{formatAr(preview.productCost)}</dd></div>
              ) : (
                <>
                  <div className="flex justify-between"><dt>Produit ({rmbValue} ¥ × {settings.rmbRate})</dt><dd>{formatAr(preview.productCost)}</dd></div>
                  <div className="flex justify-between"><dt>Transport ({preview.weightKg} kg)</dt><dd>{formatAr(preview.transport)}</dd></div>
                </>
              )}
              {preview.basis === "rmb" && <div className="flex justify-between"><dt>Frais fixes</dt><dd>{formatAr(preview.fixedFees)}</dd></div>}
              <div className="flex justify-between border-t border-black/10 pt-1.5 font-semibold"><dt>Coût de revient</dt><dd>{formatAr(preview.cost)}</dd></div>
              <div className="flex justify-between"><dt>Marge {preview.overridden ? "" : `(${preview.marginPct} %)`}</dt><dd className={preview.profit > 0 ? "text-green-700" : "text-red-700"}>{formatAr(preview.profit)}</dd></div>
              <div className="flex justify-between border-t border-black/10 pt-2 text-lg font-bold"><dt>Prix de vente</dt><dd>{formatAr(preview.price)}</dd></div>
            </dl>
          ) : (
            <ul className="space-y-1 rounded-xl bg-paper p-4 text-sm text-muted" aria-live="polite">
              {issues.map((i) => <li key={i}>• {i}</li>)}
            </ul>
          )}
          {warnings.map((w) => <p key={w} role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">⚠ {w}</p>)}
          {alt && (
            <p className="text-xs text-muted">
              {alt.basis === "rmb" ? "Si commandé en Chine (sur commande)" : "Si vendu depuis le stock de Tana"} : <b>{formatAr(alt.price)}</b>
            </p>
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
