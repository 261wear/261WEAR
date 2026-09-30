import { isAdmin } from "@/lib/auth";
import { saveImage } from "@/lib/storage";

export async function POST(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  const folder = form.get("folder") === "proofs" ? "proofs" : "products";
  const thumb = form.get("thumb");
  if (!(file instanceof File)) return Response.json({ error: "Fichier manquant" }, { status: 400 });
  try {
    return Response.json({ url: await saveImage(file, folder, thumb instanceof File ? thumb : null) });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
