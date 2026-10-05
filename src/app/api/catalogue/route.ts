import { CATALOG_PARAMS, parseCatalogParams, searchCatalog } from "@/lib/catalog";
import { CATALOG_SLICE, toCard } from "@/lib/card";

// Next slice of the catalogue, asked by the grid as the customer scrolls.
// Read from the cached snapshot: no database access.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const { query } = parseCatalogParams((k) => params.get(k));
  const from = Math.max(0, Math.min(100_000, Math.floor(Number(params.get("depuis")) || 0)));
  const { results } = await searchCatalog(query);
  return Response.json(
    { products: results.slice(from, from + CATALOG_SLICE).map(toCard), total: results.length },
    // Each filter and the slice start are part of the CDN cache key (see api/search).
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=120", "Netlify-Vary": `query=${[...CATALOG_PARAMS, "depuis"].join("|")}` } },
  );
}
