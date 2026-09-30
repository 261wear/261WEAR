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
  price_rmb: number;
  weight_kg: number | null;
  margin_pct: number | null;
  price_override: number | null;
};

export type PriceBreakdown = {
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
  const weightKg = p.weight_kg ?? s.defaultWeightKg;
  const marginPct = p.margin_pct ?? s.marginPct;
  const productCost = Math.round(p.price_rmb * s.rmbRate);
  const transport = Math.round(weightKg * s.transportPerKg);
  const cost = productCost + transport + s.fixedFees;
  const step = s.roundTo > 0 ? s.roundTo : 1;
  const computed = Math.ceil((cost * (1 + marginPct / 100)) / step) * step;
  const overridden = p.price_override != null && p.price_override > 0;
  const price = overridden ? p.price_override! : computed;
  return {
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
