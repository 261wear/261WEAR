import { isAdmin } from "@/lib/auth";
import { readLocalImage } from "@/lib/storage";

// Serves images uploaded in local development (production uses Vercel Blob).
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[name]">) {
  const { name } = await ctx.params;
  if (name.startsWith("proofs-") && !(await isAdmin())) {
    return new Response("Non autorisé", { status: 401 });
  }
  const file = await readLocalImage(name);
  if (!file) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.type,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": name.startsWith("proofs-") ? "private, no-store" : "public, max-age=31536000, immutable",
    },
  });
}
