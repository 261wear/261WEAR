// Short product address for social posts: 261wear.com/p/123 → /produit/123.
// Easy to type from an Instagram or TikTok caption, where links are not clickable.
// No database read: the product page handles unknown ids itself.
export async function GET(request: Request, ctx: RouteContext<"/p/[id]">) {
  const { id } = await ctx.params;
  const target = /^\d{1,9}$/.test(id) ? `/produit/${id}` : "/";
  return new Response(null, {
    status: 308,
    headers: { Location: new URL(target, request.url).toString(), "Cache-Control": "public, max-age=86400" },
  });
}
