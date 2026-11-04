import { isDbId } from "@/lib/orders-shared";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/site";
import { getStudioProducts, suggestStudioProducts } from "./actions";
import { Studio } from "./Studio";

export default async function ReseauxPage(props: PageProps<"/admin/reseaux">) {
  const { produits } = await props.searchParams;
  const ids = typeof produits === "string" ? produits.split(",").map(Number).filter(isDbId) : [];
  const [initial, preselected, settings] = await Promise.all([suggestStudioProducts("mix", ids), getStudioProducts(ids), getSettings()]);

  return (
    <>
      <h1 className="font-display text-3xl">Studio réseaux</h1>
      <p className="mt-1 mb-6 max-w-2xl text-sm text-muted">
        Les photos des paires dans nos cadres signature, prêtes pour Instagram, TikTok et Facebook : choisis les paires, le cadre et le format,
        puis télécharge tout d&apos;un coup. La légende avec le prix et le lien de la paire est prête à coller.
      </p>
      <Studio
        initial={initial}
        preselected={preselected}
        origin={siteUrl()}
        delivery={{
          order: `${settings.deliveryMinDays} à ${settings.deliveryMaxDays} jours`,
          stock: `${settings.stockDeliveryMinDays} à ${settings.stockDeliveryMaxDays} jours`,
        }}
      />
    </>
  );
}
