import "server-only";
import { query } from "./db";
import { freshness, type Freshness, type ProductStatus } from "./product-status";
import { listProducts, type PricedProduct } from "./products";
import { scoreFields, tokenize } from "./search";
import { getSettings } from "./settings";

export type ShopProduct = PricedProduct & { fresh: Freshness };

export const SORTS = [
  { id: "pertinence", label: "Pertinence" },
  { id: "nouveautes", label: "Nouveautés" },
  { id: "prix_asc", label: "Prix croissant" },
  { id: "prix_desc", label: "Prix décroissant" },
] as const;

export type CatalogQuery = {
  q?: string;
  cat?: string;
  taille?: string;
  dispo?: string;
  min?: number;
  max?: number;
  tri?: string;
};

// The public catalogue is read on every search keystroke: keep it in memory a
// few seconds. Every back-office write clears it (invalidateCatalog), so the
// instance that made the change is always up to date.
const CACHE_MS = 15_000;
const globalCache = globalThis as unknown as { __catalog?: { at: number; data: Promise<ShopProduct[]> } };

export function invalidateCatalog() {
  globalCache.__catalog = undefined;
}

export async function shopProducts(): Promise<ShopProduct[]> {
  const hit = globalCache.__catalog;
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const data = (async () => {
    const [products, settings] = await Promise.all([listProducts({ onlyActive: true }), getSettings()]);
    return products.map((p) => ({ ...p, fresh: freshness(p, settings.badgeDays) }));
  })();
  globalCache.__catalog = { at: Date.now(), data };
  data.catch(() => invalidateCatalog());
  return data;
}

function fields(p: PricedProduct) {
  return [
    { text: p.name, weight: 3 },
    { text: p.ref ?? "", weight: 4, exact: true },
    { text: p.category, weight: 2 },
    { text: p.sizes.join(" "), weight: 1.5, exact: true },
    { text: p.description, weight: 0.7 },
  ];
}

function countBy<T extends string>(items: ShopProduct[], key: (p: ShopProduct) => T[]) {
  const m = new Map<T, number>();
  for (const p of items) for (const k of new Set(key(p))) if (k) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].map(([value, count]) => ({ value, count }));
}

export async function searchCatalog(query: CatalogQuery) {
  const all = await shopProducts();
  const tokens = tokenize(query.q ?? "");

  let approximate = false;
  let scored = all.map((p) => ({ p, score: scoreFields(tokens, fields(p)) })).filter((x) => x.score > 0);
  if (tokens.length && !scored.length) {
    approximate = true;
    scored = all.map((p) => ({ p, score: scoreFields(tokens, fields(p), true) })).filter((x) => x.score > 0);
  }
  const matched = scored.map((x) => x.p);

  // Facets are counted on the text matches, before the facet filters themselves.
  const facets = {
    categories: countBy(matched, (p) => [p.category]).sort((a, b) => b.count - a.count),
    sizes: countBy(matched, (p) => p.sizes).sort((a, b) => Number(a.value) - Number(b.value) || a.value.localeCompare(b.value)),
    availability: countBy(matched, (p) => [p.status as ProductStatus]),
    priceRange: matched.length
      ? { min: Math.min(...matched.map((p) => p.pricing.price)), max: Math.max(...matched.map((p) => p.pricing.price)) }
      : null,
  };

  let results = scored.filter(({ p }) => {
    if (query.cat && p.category !== query.cat) return false;
    if (query.taille && !p.sizes.includes(query.taille)) return false;
    if (query.dispo && p.status !== query.dispo) return false;
    if (query.min != null && p.pricing.price < query.min) return false;
    if (query.max != null && p.pricing.price > query.max) return false;
    return true;
  });

  const tri = query.tri ?? (tokens.length ? "pertinence" : "nouveautes");
  const newest = (p: ShopProduct) => (p.published_at ?? p.created_at).getTime();
  results = [...results].sort((a, b) => {
    // Sold-out items always come last.
    const soldOut = Number(a.p.status === "epuise") - Number(b.p.status === "epuise");
    if (soldOut) return soldOut;
    if (tri === "prix_asc") return a.p.pricing.price - b.p.pricing.price;
    if (tri === "prix_desc") return b.p.pricing.price - a.p.pricing.price;
    if (tri === "nouveautes" || !tokens.length) return newest(b.p) - newest(a.p);
    return b.score - a.score || newest(b.p) - newest(a.p);
  });

  return { results: results.map((x) => x.p), total: all.length, facets, approximate, tokens, tri };
}

export async function suggest(q: string) {
  const { results, facets } = await searchCatalog({ q });
  return {
    products: results.slice(0, 6).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.pricing.price,
      image: p.images[0] ?? null,
      status: p.status,
    })),
    categories: facets.categories.slice(0, 3),
    total: results.length,
  };
}

// Shown in the header on every page: counted by the database, not in memory.
export async function popularCategories() {
  const rows = await query(
    `SELECT category AS value, COUNT(*)::int AS count FROM products
     WHERE status <> 'brouillon' AND category <> '' GROUP BY category ORDER BY count DESC, category LIMIT 6`,
  );
  return rows.map((r) => ({ value: String(r.value), count: Number(r.count) }));
}
