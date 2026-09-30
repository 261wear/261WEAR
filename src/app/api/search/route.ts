import { suggest } from "@/lib/catalog";

// Instant suggestions for the search box.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.slice(0, 80) ?? "";
  if (!q.trim()) return Response.json({ products: [], categories: [], total: 0 });
  return Response.json(await suggest(q), { headers: { "Cache-Control": "private, max-age=30" } });
}
