import { headers } from "next/headers";
import { FB_MAX_PHOTOS, facebookConfigured, getPageName, listPosts } from "@/lib/facebook";
import { listProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { Composer } from "./Composer";

export default async function FacebookPage(props: PageProps<"/admin/facebook">) {
  const [products, settings, posts, { produits }, h] = await Promise.all([
    listProducts({ onlyActive: false }),
    getSettings(),
    listPosts(),
    props.searchParams,
    headers(),
  ]);
  const configured = facebookConfigured();
  const page = configured ? await getPageName() : null;
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const preselected = typeof produits === "string" ? produits.split(",").map(Number).filter(Number.isInteger) : [];

  return (
    <>
      <h1 className="font-display text-3xl">Publier sur Facebook</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        Choisis des produits et leurs photos : le texte est généré (prix, pointures, lien de commande), tu peux le modifier puis publier ou programmer.
      </p>

      {!configured ? (
        <div className="card mb-6 border-amber-200 bg-amber-50 p-5 text-sm">
          <p className="font-semibold text-amber-900">Page Facebook non connectée</p>
          <p className="mt-1 text-amber-900">
            Ajoute dans Vercel (Settings → Environment Variables) : <code>FACEBOOK_PAGE_ID</code> et <code>FACEBOOK_PAGE_ACCESS_TOKEN</code>{" "}
            (jeton de Page avec les permissions <code>pages_manage_posts</code> et <code>pages_read_engagement</code>), puis redéploie.
            En attendant, tu peux préparer la publication, copier le texte et télécharger les photos pour poster à la main.
          </p>
        </div>
      ) : page?.error ? (
        <div className="card mb-6 border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
          <p className="font-semibold">Connexion à la Page impossible</p>
          <p className="mt-1">{page.error} — le jeton a peut-être expiré : génère un nouveau jeton de Page.</p>
        </div>
      ) : (
        <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#1877F2]/10 px-3 py-1.5 text-sm font-semibold text-[#1877F2]">
          ● Connecté à la Page « {page?.name} »
        </p>
      )}

      <Composer
        canPublish={configured && !page?.error}
        maxPhotos={FB_MAX_PHOTOS}
        origin={origin}
        deliveryText={`${settings.deliveryMinDays} à ${settings.deliveryMaxDays} jours`}
        stockDeliveryText={`${settings.stockDeliveryMinDays} à ${settings.stockDeliveryMaxDays} jours`}
        preselected={preselected}
        products={products
          .filter((p) => p.images.length)
          .map((p) => ({ id: p.id, ref: p.ref, name: p.name, category: p.category, price: p.pricing.price, sizes: p.sizes, images: p.images, active: p.active && p.status !== "epuise", inStock: p.status === "en_stock" }))}
      />

      <h2 className="mt-10 text-lg font-semibold">Dernières publications</h2>
      <div className="card mt-3 divide-y divide-black/5">
        {posts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 whitespace-pre-line">{p.message}</p>
              <p className="mt-1 text-xs text-muted">
                {p.createdAt.toLocaleString("fr-FR", { timeZone: "Indian/Antananarivo", dateStyle: "short", timeStyle: "short" })} · {p.photoCount} photo{p.photoCount > 1 ? "s" : ""}
                {p.scheduledAt && ` · programmée pour le ${p.scheduledAt.toLocaleString("fr-FR", { timeZone: "Indian/Antananarivo", dateStyle: "short", timeStyle: "short" })}`}
              </p>
              {p.error && <p className="mt-1 text-xs text-red-700">{p.error}</p>}
            </div>
            <div className="text-right">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.status === "publie" ? "bg-green-100 text-green-800" : p.status === "programme" ? "bg-sky-100 text-sky-800" : "bg-red-100 text-red-800"}`}>
                {p.status === "publie" ? "Publiée" : p.status === "programme" ? "Programmée" : "Échec"}
              </span>
              {p.fbPostId && (
                <a href={`https://www.facebook.com/${p.fbPostId}`} target="_blank" rel="noopener" className="mt-2 block text-xs underline">
                  Voir sur Facebook ↗
                </a>
              )}
            </div>
          </div>
        ))}
        {!posts.length && <p className="p-6 text-sm text-muted">Aucune publication pour l&apos;instant.</p>}
      </div>
    </>
  );
}
