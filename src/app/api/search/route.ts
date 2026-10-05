import { suggest } from "@/lib/catalog";

const EMPTY = { products: [], categories: [], total: 0 };

// Instant suggestions for the search box.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.slice(0, 80) ?? "";
  if (!q.trim()) return Response.json(EMPTY);
  try {
    // Same answer for everyone: the CDN keeps it two minutes, so repeated
    // searches do not start the server.
    return Response.json(await suggest(q), {
      // Netlify's CDN leaves query parameters out of its cache key unless they
      // are listed here: without it, "adidas" could get the answer cached for "nike".
      headers: { "Cache-Control": "public, max-age=30, s-maxage=120", "Netlify-Vary": "query=q" },
    });
  } catch (err) {
    // Catalogue unavailable: the box simply shows no suggestion (never cached).
    console.error("Search suggestions failed", err);
    return Response.json(EMPTY, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
