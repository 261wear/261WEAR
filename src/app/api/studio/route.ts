import { isAdmin } from "@/lib/auth";
import { getProduct } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { isFormat, isFrame, TITLE_MAX, defaultTitle } from "@/lib/social";
import { renderStudioImage } from "@/lib/studio-render";

// Framed photo of a product for the social networks (back-office only).
// ?id=12&photo=0&frame=ticket&format=4x5&fit=cover&title=…&price=1
// The photo is picked by its index in the product: never an arbitrary address.
export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Non autorisé", { status: 401 });
  const q = new URL(request.url).searchParams;
  const frame = q.get("frame");
  const format = q.get("format");
  const photoIndex = Number(q.get("photo") ?? 0);
  if (!isFrame(frame) || !isFormat(format) || !Number.isInteger(photoIndex) || photoIndex < 0) {
    return new Response("Paramètres invalides", { status: 400 });
  }
  const [product, settings] = await Promise.all([getProduct(Number(q.get("id"))), getSettings()]);
  const photoUrl = product?.images[photoIndex];
  if (!product || !photoUrl) return new Response("Introuvable", { status: 404 });

  try {
    return await renderStudioImage(
      {
        frame,
        format,
        fit: q.get("fit") === "contain" ? "contain" : "cover",
        title: (q.get("title") || defaultTitle(frame)).slice(0, TITLE_MAX),
        showPrice: q.get("price") !== "0",
        product: { name: product.name, status: product.status, price: product.pricing.price, sizes: product.sizes },
        photoUrl,
        delivery: {
          order: `${settings.deliveryMinDays} à ${settings.deliveryMaxDays} jours`,
          stock: `${settings.stockDeliveryMinDays} à ${settings.stockDeliveryMaxDays} jours`,
        },
      },
      // Private (admin only); kept a few minutes so going back and forth costs nothing,
      // short enough that a price change shows up quickly.
      { "Cache-Control": "private, max-age=600" },
    );
  } catch (err) {
    console.error("Studio image failed", err);
    return new Response((err as Error).message || "Image impossible à générer", { status: 502 });
  }
}
