// Pure pricing helpers, shared by server pages and the admin live preview.

export type PricingSettings = {
  rmbRate: number; // 1 RMB = x Ar
  transportPerKg: number; // Ar per kg, China -> Tana
  defaultWeightKg: number;
  marginPct: number;
  fixedFees: number; // Ar per pair: packaging, local delivery, ...
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

export function priceBasis(p: Pick<PricedInput, "price_rmb" | "cost_ar" | "status">): PriceBasis {
  if (p.cost_ar != null && p.cost_ar > 0 && (p.status === "en_stock" || !(p.price_rmb != null && p.price_rmb > 0))) return "ar";
  return "rmb";
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
  // Stock bought in Ariary already includes transport to Tana.
  const productCost = basis === "ar" ? Math.round(p.cost_ar!) : Math.round((p.price_rmb ?? 0) * s.rmbRate);
  const transport = basis === "ar" ? 0 : Math.round(weightKg * s.transportPerKg);
  const cost = productCost + transport + s.fixedFees;
  const step = s.roundTo > 0 ? s.roundTo : 1;
  const computed = Math.ceil((cost * (1 + marginPct / 100)) / step) * step;
  const overridden = p.price_override != null && p.price_override > 0;
  const price = overridden ? p.price_override! : computed;
  return {
    basis,
    productCost,
    transport,
    fixedFees: s.fixedFees,
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
