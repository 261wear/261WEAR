import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/Gallery";
import { OrderForm } from "@/components/OrderForm";
import { depositFor, formatAr } from "@/lib/pricing";
import { getProduct } from "@/lib/products";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(props: PageProps<"/produit/[id]">): Promise<Metadata> {
  const product = await getProduct(Number((await props.params).id));
  if (!product) return {};
  return {
    title: product.name,
    description: `${product.name} — ${formatAr(product.pricing.price)}, livrée à Tana.`,
    openGraph: { images: product.images.slice(0, 1) },
  };
}

export default async function ProductPage(props: PageProps<"/produit/[id]">) {
  const [product, settings] = await Promise.all([
    getProduct(Number((await props.params).id)),
    getSettings(),
  ]);
  if (!product || !product.active) notFound();
  const price = product.pricing.price;
  const deposit = depositFor(price, settings.depositPct);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
      <Gallery images={product.images} alt={product.name} />
      <div>
        {product.category && <p className="text-sm font-semibold tracking-wide text-muted uppercase">{product.category}</p>}
        <h1 className="font-display mt-1 text-4xl sm:text-5xl">{product.name}</h1>
        <p className="mt-4 text-3xl font-bold">{formatAr(price)}</p>
        <p className="mt-1 text-sm text-black/60">
          Livrée à Tana · Acompte {formatAr(deposit)} ({settings.depositPct} %) à la commande, le reste à la livraison.
        </p>
        <div className="card mt-5 grid grid-cols-3 divide-x divide-black/10 text-center text-xs">
          <div className="p-3"><p className="font-bold">{settings.deliveryMinDays}–{settings.deliveryMaxDays} j</p>Livraison</div>
          <div className="p-3"><p className="font-bold">Photo QC</p>avant envoi</div>
          <div className="p-3"><p className="font-bold">Suivi</p>en ligne</div>
        </div>
        {product.description && <p className="mt-6 whitespace-pre-line text-black/80">{product.description}</p>}
        <div className="mt-8">
          <OrderForm productId={product.id} sizes={product.sizes} />
        </div>
      </div>
    </div>
  );
}
