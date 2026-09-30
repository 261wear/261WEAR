// Pure pricing helpers, shared by server pages and the admin live preview.

export type PricingSettings = {
  rmbRate: number; // 1 RMB = x Ar
  transportPerKg: number; // Ar per kg, China -> Tana
  defaultWeightKg: number;
  marginPct: number;
  fixedFees: number; // Ar per pair ordered from China: packaging, local delivery, ...
  roundTo: number; // round the selling price up to this step
};

export type PricedInput = {
  price_rmb: number | null; // supplier price, for products ordered from China
  cost_ar: number | null; // purchase price in Ariary, for stock already in Tana
  status?: string;
  weight_kg: number | null;
  margin_pct: number | null;
  price_override: number | null;
};

// "rmb": China price + transport (sur commande). "ar": landed cost in Ariary (disponible de suite).
export type PriceBasis = "rmb" | "ar";

// Only "sur commande" is priced from China when both prices exist; otherwise the
// purchase price in Ar wins (it is complete on its own, no weight needed).
export function priceBasis(p: Pick<PricedInput, "price_rmb" | "cost_ar" | "status">): PriceBasis {
  const hasAr = p.cost_ar != null && p.cost_ar > 0;
  const hasRmb = p.price_rmb != null && p.price_rmb > 0;
  if (!hasAr) return "rmb";
  return p.status === "sur_commande" && hasRmb ? "rmb" : "ar";
}

export type PriceBreakdown = {
  basis: PriceBasis;
  productCost: number;
  transport: number;
  fixedFees: number;
  cost: number;
  weightKg: number;
  marginPct: number;
  price: number;
  profit: number;
  overridden: boolean;
};

export function computePrice(s: PricingSettings, p: PricedInput): PriceBreakdown {
  const basis = priceBasis(p);
  const weightKg = p.weight_kg ?? s.defaultWeightKg;
  const marginPct = p.margin_pct ?? s.marginPct;
  // Stock already in Tana: the purchase price in Ariary is the whole cost
  // (no transport, no extra fees). Only products ordered from China add them.
  const productCost = basis === "ar" ? Math.round(p.cost_ar!) : Math.round((p.price_rmb ?? 0) * s.rmbRate);
  const transport = basis === "ar" ? 0 : Math.round(weightKg * s.transportPerKg);
  const fixedFees = basis === "ar" ? 0 : s.fixedFees;
  const cost = productCost + transport + fixedFees;
  const step = s.roundTo > 0 ? s.roundTo : 1;
  const computed = Math.ceil((cost * (1 + marginPct / 100)) / step) * step;
  const overridden = p.price_override != null && p.price_override > 0;
  const price = overridden ? p.price_override! : computed;
  return {
    basis,
    productCost,
    transport,
    fixedFees,
    cost,
    weightKg,
    marginPct,
    price,
    profit: price - cost,
    overridden,
  };
}

export function depositFor(total: number, depositPct: number) {
  return Math.ceil((total * depositPct) / 100 / 1000) * 1000;
}

export function formatAr(n: number) {
  return `${Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ")} Ar`;
}
