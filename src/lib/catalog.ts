import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { queryStatic, type Row } from "./db";
import { computePrice } from "./pricing";
import { freshness, type Freshness, type ProductStatus } from "./product-status";
import { toProduct, type PricedProduct } from "./products";
import { scoreFields, tokenize } from "./search";
import { parseSettings, type Settings } from "./settings";

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

// Everything the shop shows comes from this snapshot of the database, kept in
// the Next.js cache: visitors and crawlers never reach the database, which can
// stay asleep. It is read again at most once an hour, and at once after any
// back-office change (refreshShop in admin/actions clears SHOP_TAG).
export const SHOP_TAG = "shop";
const HOUR = 3600;

// Next.js silently refuses cache entries above 2 MB, and the read would then
// hit the database on every visit. The catalogue is stored in slices that stay
// well under that, even with long descriptions.
const SLICE = 150;

const snapshot = { tags: [SHOP_TAG], revalidate: HOUR };

const readSettings = unstable_cache(
  async () => ((await queryStatic(`SELECT value FROM settings WHERE key = 'main'`))[0]?.value as string | undefined) ?? null,
  ["shop-settings"],
  snapshot,
);

const readCount = unstable_cache(
  async () => Number((await queryStatic(`SELECT COUNT(*)::int AS n FROM products WHERE status <> 'brouillon'`))[0].n),
  ["shop-count"],
  snapshot,
);

const readSlice = unstable_cache(
  (offset: number) =>
    queryStatic(
      `SELECT * FROM products WHERE status <> 'brouillon'
       ORDER BY (status = 'epuise'), COALESCE(published_at, created_at) DESC, id DESC
       LIMIT ${SLICE} OFFSET $1`,
      [offset],
    ),
  ["shop-products"],
  snapshot,
);

// Shop settings (delivery times, WhatsApp, deposit…), from the snapshot.
export const shopSettings = cache(async (): Promise<Settings> => parseSettings(await readSettings()));

async function loadCatalog(): Promise<ShopProduct[]> {
  const [count, settings] = await Promise.all([readCount(), shopSettings()]);
  const offsets = Array.from({ length: Math.ceil(count / SLICE) }, (_, i) => i * SLICE);
  const rows = (await Promise.all(offsets.map((o) => readSlice(o)))).flat();
  // Slices refreshed at different moments can overlap: keep each product once.
  const unique = [...new Map(rows.map((r: Row) => [r.id, r])).values()];
  // Prices and badges are computed on the way out, not stored: they follow the
  // settings and the current date.
  return unique.map((r) => {
    const p = toProduct(r);
    return { ...p, pricing: computePrice(settings, p), fresh: freshness(p, settings.badgeDays) };
  });
}

// For pages: one read per render.
export const shopProducts = cache(loadCatalog);

// A published product, or null (drafts are not in the snapshot).
export async function shopProduct(id: number) {
  return (await shopProducts()).find((p) => p.id === id) ?? null;
}

// The search runs on every keystroke: on top of the snapshot, the catalogue
// stays in memory for a minute so the Next.js cache is not read each time.
// Only the search uses it; cached pages always read the snapshot itself.
const MEMORY_MS = 60_000;
const globalCache = globalThis as unknown as { __catalog?: { at: number; data: Promise<ShopProduct[]> } };

export function invalidateCatalog() {
  globalCache.__catalog = undefined;
}

function searchableProducts(): Promise<ShopProduct[]> {
  const hit = globalCache.__catalog;
  if (hit && Date.now() - hit.at < MEMORY_MS) return hit.data;
  const data = loadCatalog();
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
  const all = await searchableProducts();
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

// Shown in the header on every page: counted on the snapshot, no database read.
export async function popularCategories() {
  return countBy(await shopProducts(), (p) => [p.category])
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, 6);
}
