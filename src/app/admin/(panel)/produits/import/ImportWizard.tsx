"use client";

import { useState } from "react";
import { ProductSheetsStep } from "./ProductSheetsStep";
import { PhotosStep } from "./PhotosStep";
import type { PricingSettings } from "@/lib/pricing";
import type { ProductStatus } from "@/lib/product-status";

export type ProductSummary = {
  id: number;
  ref: string | null;
  name: string;
  images: number;
  active: boolean;
  status: ProductStatus;
  price_rmb: number;
};

export function ImportWizard({
  initialStep,
  settings,
  products,
}: {
  initialStep: 1 | 2;
  settings: PricingSettings;
  products: ProductSummary[];
}) {
  const [step, setStep] = useState<1 | 2>(initialStep);
  const withRef = products.filter((p) => p.ref).length;
  const tab = (n: 1 | 2, title: string, sub: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={step === n}
      onClick={() => setStep(n)}
      className={`flex-1 rounded-xl border p-4 text-left transition ${step === n ? "border-ink bg-white" : "border-transparent bg-black/[0.04] hover:bg-black/[0.07]"}`}
    >
      <span className={`mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === n ? "bg-ink text-white" : "bg-black/10"}`}>{n}</span>
      <span className="font-semibold">{title}</span>
      <span className="mt-1 block text-xs text-muted">{sub}</span>
    </button>
  );
  return (
    <>
      <div role="tablist" className="mb-6 flex flex-col gap-3 sm:flex-row">
        {tab(1, "Fiches produits", "Fichier CSV ou copier-coller depuis Excel / Google Sheets")}
        {tab(2, "Photos", `Rangées par référence · ${withRef} produit${withRef > 1 ? "s" : ""} avec référence`)}
      </div>
      {step === 1 ? (
        <ProductSheetsStep settings={settings} products={products} onDone={() => setStep(2)} />
      ) : (
        <PhotosStep products={products} />
      )}
    </>
  );
}
