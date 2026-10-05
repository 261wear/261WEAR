import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { queryStatic, type Row } from "./db";
import { computePrice } from "./pricing";
import { freshness, isProductStatus, productStatus, type Freshness, type ProductStatus } from "./product-status";
import { toProduct, type PricedProduct, type Product } from "./products";
import { createScorer, prepareFields, tokenize, type PreparedField } from "./search";
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

// URL parameters of the catalogue (?q=…&cat=…&tri=…), read the same way by the
// page and by /api/catalogue, which serves the next slices as the customer scrolls.
export const CATALOG_PARAMS = ["q", "cat", "taille", "dispo", "min", "max", "tri"] as const;

export function parseCatalogParams(get: (key: string) => string | null | undefined) {
  const current: Record<string, string> = {};
  for (const k of CATALOG_PARAMS) {
    const v = (get(k) ?? "").slice(0, 80);
    if (v) current[k] = v;
  }
  const num = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);
  const query: CatalogQuery = {
    q: current.q,
    cat: current.cat,
    taille: current.taille,
    dispo: isProductStatus(current.dispo) && productStatus(current.dispo).isPublic ? current.dispo : undefined,
    min: num(current.min),
    max: num(current.max),
    tri: SORTS.some((s) => s.id === current.tri) ? current.tri : undefined,
  };
  return { current, query };
}

// Everything the shop shows comes from this snapshot of the database, kept in
// the Next.js cache: visitors and crawlers never reach the database, which can
// stay asleep. It is read again once a day, and at once after any back-office
// change (refreshShop in admin/actions clears SHOP_TAG). Every change goes
// through the back-office, so a shorter delay would only re-read the same data:
// a full read is several MB of database egress, capped on the free plan.
export const SHOP_TAG = "shop";
const DAY = 86400;

// Next.js silently refuses cache entries above 2 MB, and the read would then
// hit the database on every visit. The catalogue is stored in slices that stay
// well under that, even with long descriptions.
const SLICE = 150;

const snapshot = { tags: [SHOP_TAG], revalidate: DAY };

const readSettings = unstable_cache(
  async () => ((await queryStatic(`SELECT value FROM settings WHERE key = 'main'`))[0]?.value as string | undefined) ?? null,
  ["shop-settings"],
  snapshot,
);

const readMaxId = unstable_cache(
  async () => Number((await queryStatic(`SELECT COALESCE(MAX(id), 0)::int AS n FROM products`))[0].n),
  ["shop-max-id"],
  snapshot,
);

// Slices are id ranges read through the primary key: no sort and no OFFSET in
// the database. Sorting thousands of full rows (descriptions, photo lists) in
// ~30 parallel queries ran the small Neon instance out of memory, and the
// failed reads, never cached, were retried by every visitor.
const readSlice = unstable_cache(
  (start: number) =>
    queryStatic(`SELECT * FROM products WHERE id >= $1 AND id < $2 AND status <> 'brouillon'`, [start, start + SLICE]),
  ["shop-slice"],
  snapshot,
);

// A few slices at a time, so a cold cache does not hit the database all at once.
const PARALLEL = 4;

// Shop settings (delivery times, WhatsApp, deposit…), from the snapshot.
export const shopSettings = cache(async (): Promise<Settings> => parseSettings(await readSettings()));

const newest = (p: Product) => (p.published_at ?? p.created_at).getTime();

async function readCatalog(): Promise<ShopProduct[]> {
  const [maxId, settings] = await Promise.all([readMaxId(), shopSettings()]);
  const starts = Array.from({ length: Math.ceil(maxId / SLICE) }, (_, i) => 1 + i * SLICE);
  const rows: Row[] = [];
  for (let i = 0; i < starts.length; i += PARALLEL) {
    rows.push(...(await Promise.all(starts.slice(i, i + PARALLEL).map((s) => readSlice(s)))).flat());
  }
  // Prices and badges are computed on the way out, not stored: they follow the
  // settings and the current date.
  return rows
    .map((r) => {
      const p = toProduct(r);
      return { ...p, pricing: computePrice(settings, p), fresh: freshness(p, settings.badgeDays) };
    })
    // Sold-out last, then newest first.
    .sort((a, b) => Number(a.status === "epuise") - Number(b.status === "epuise") || newest(b) - newest(a) || b.id - a.id);
}

// Last catalogue read successfully by this server instance: if the database is
// unreachable (quota, outage), the shop keeps showing it instead of an error.
const lastGood = globalThis as unknown as { __lastCatalog?: ShopProduct[] };

async function loadCatalog(): Promise<ShopProduct[]> {
  try {
    const data = await readCatalog();
    lastGood.__lastCatalog = data;
    return data;
  } catch (err) {
    if (lastGood.__lastCatalog) {
      console.error("Catalogue: database unreachable, serving the last copy", err);
      return lastGood.__lastCatalog;
    }
    throw err;
  }
}

// Version of the snapshot: a timestamp cached under the same tag, so it changes
// with any back-office change and with the daily refresh. Checking it is one
// small cache read; the catalogue itself (several MB) is read only when it changed.
const readVersion = unstable_cache(async () => String(Date.now()), ["shop-version"], snapshot);

// Kept in the server's memory between requests (product pages, search on every
// keystroke): on a warm server, rendering a page no longer re-reads the catalogue.
const memory = globalThis as unknown as { __catalog?: { version: string; data: Promise<ShopProduct[]> } };

export function invalidateCatalog() {
  memory.__catalog = undefined;
}

async function currentCatalog(): Promise<ShopProduct[]> {
  const version = await readVersion();
  const hit = memory.__catalog;
  if (hit && hit.version === version) return hit.data;
  const data = loadCatalog();
  memory.__catalog = { version, data };
  data.catch(() => {
    if (memory.__catalog?.data === data) invalidateCatalog();
  });
  return data;
}

// For pages and the search.
export const shopProducts = cache(currentCatalog);

// A published product, or null (drafts are not in the snapshot).
export async function shopProduct(id: number) {
  return (await shopProducts()).find((p) => p.id === id) ?? null;
}

// Normalized once per product and kept as long as the catalogue stays in memory.
const preparedCache = new WeakMap<ShopProduct, PreparedField[]>();

function fields(p: ShopProduct) {
  let prepared = preparedCache.get(p);
  if (!prepared) preparedCache.set(p, (prepared = prepareFields(searchFields(p))));
  return prepared;
}

function searchFields(p: PricedProduct) {
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
  const score = createScorer(tokens);
  let scored = all.map((p) => ({ p, score: score(fields(p)) })).filter((x) => x.score > 0);
  if (tokens.length && !scored.length) {
    approximate = true;
    scored = all.map((p) => ({ p, score: score(fields(p), true) })).filter((x) => x.score > 0);
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
