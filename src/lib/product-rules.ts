// Single source of truth for product validation: used by the product form,
// the bulk import (browser preview and server) and the quick status switch.

import { computePrice, type PricingSettings } from "./pricing";
import { isProductStatus, type ProductStatus } from "./product-status";

export const LIMITS = {
  name: 120,
  category: 60,
  description: 3000,
  size: 10,
  sizes: 30,
  rmbMax: 100_000,
  arMin: 1_000,
  arMax: 50_000_000,
  weightMin: 0.1,
  weightMax: 20,
  marginMax: 500,
} as const;

export type ProductCore = {
  name: string;
  status: ProductStatus;
  price_rmb: number | null;
  cost_ar: number | null;
  weight_kg: number | null;
  margin_pct: number | null;
  price_override: number | null;
  sizes: string[];
};

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

export function productIssues(p: ProductCore): string[] {
  const e: string[] = [];
  if (!p.name?.trim()) e.push("Nom manquant");
  else if (p.name.length > LIMITS.name) e.push(`Nom trop long (${LIMITS.name} caractères max)`);
  if (!isProductStatus(p.status)) e.push("Statut invalide");

  if (p.price_rmb !== null && !(isNum(p.price_rmb) && p.price_rmb > 0 && p.price_rmb <= LIMITS.rmbMax)) e.push("Prix RMB invalide");
  if (p.cost_ar !== null && !(isNum(p.cost_ar) && p.cost_ar >= LIMITS.arMin && p.cost_ar <= LIMITS.arMax)) {
    e.push(`Prix d'achat en Ar invalide (entre ${LIMITS.arMin.toLocaleString("fr-FR")} et ${LIMITS.arMax.toLocaleString("fr-FR")})`);
  }
  if (p.price_rmb === null && p.cost_ar === null) e.push("Indique un prix fournisseur (RMB) ou un prix d'achat (Ar)");
  if (p.status === "sur_commande" && p.price_rmb === null) e.push("Sur commande : le prix fournisseur en RMB est obligatoire");
  // A price from China is only complete with the weight (transport is paid per kg).
  const usesRmb = p.status === "sur_commande" || (p.status !== "en_stock" && p.cost_ar === null && p.price_rmb !== null);
  if (usesRmb && p.price_rmb !== null && p.weight_kg === null) e.push("Import Chine : le poids est obligatoire (transport au kg)");
  if (p.status === "en_stock" && p.cost_ar === null) e.push("Disponible de suite : le prix d'achat en Ar est obligatoire");

  if (p.weight_kg !== null && !(isNum(p.weight_kg) && p.weight_kg >= LIMITS.weightMin && p.weight_kg <= LIMITS.weightMax)) {
    e.push(`Poids invalide (${LIMITS.weightMin} à ${LIMITS.weightMax} kg)`);
  }
  if (p.margin_pct !== null && !(isNum(p.margin_pct) && p.margin_pct >= 0 && p.margin_pct <= LIMITS.marginMax)) {
    e.push(`Marge invalide (0 à ${LIMITS.marginMax} %)`);
  }
  if (p.price_override !== null && !(isNum(p.price_override) && p.price_override >= LIMITS.arMin && p.price_override <= LIMITS.arMax)) {
    e.push("Prix forcé invalide");
  }
  if (p.sizes.length > LIMITS.sizes) e.push(`Trop de pointures (${LIMITS.sizes} max)`);
  if (p.sizes.some((s) => s.length > LIMITS.size)) e.push("Pointure trop longue");
  if (new Set(p.sizes).size !== p.sizes.length) e.push("Pointure en double");
  return e;
}

// Non-blocking: shown in the form / import preview.
export function productWarnings(p: ProductCore, s: PricingSettings): string[] {
  if (productIssues(p).length) return [];
  const w: string[] = [];
  const price = computePrice(s, p);
  if (price.overridden && price.price < price.cost) w.push(`Prix forcé inférieur au coût de revient (perte de ${(price.cost - price.price).toLocaleString("fr-FR")} Ar)`);
  return w;
}

// Product photos: our own uploads (local dev) or https links (Vercel Blob, pasted URLs).
export function isAllowedImageUrl(u: unknown): u is string {
  return (
    typeof u === "string" &&
    u.length <= 500 &&
    (/^\/api\/files\/[a-z]+-\d+-[a-f0-9]+\.(jpg|png|webp|gif)$/.test(u) || /^https:\/\/[^\s"'<>\\]+$/.test(u))
  );
}

export const MAX_IMAGES = 12;
