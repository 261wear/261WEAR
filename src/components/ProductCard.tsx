import { thumbUrl } from "@/lib/images";
import Link from "next/link";
import type { ShopProduct } from "@/lib/catalog";
import { formatAr } from "@/lib/pricing";
import { Highlight } from "./Highlight";
import { FreshBadge, StatusBadge } from "./ProductBadges";
import { Img } from "./ui/Img";

export function ProductCard({ product, query = "", priority = false }: { product: ShopProduct; query?: string; priority?: boolean }) {
  const soldOut = product.status === "epuise";
  // "Néon" frame from the brand moodboard: pairs already in Tana glow citron.
  const neon = product.status === "en_stock";
  return (
    <Link href={`/produit/${product.id}`} className="group block">
      <div className={`relative aspect-square overflow-hidden rounded-2xl bg-white ${neon ? "ring-4 ring-accent shadow-[0_0_24px_rgba(198,255,61,0.55)]" : ""}`}>
        {/* Brand placeholder under the photo while it loads (slow mobile networks). */}
        <span aria-hidden="true" className="font-display absolute inset-0 flex items-center justify-center text-4xl text-black/5">261</span>
        {product.images[0] ? (
          <Img
            src={thumbUrl(product.images[0])}
            fallback={product.images[0]}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className={`relative h-full w-full object-cover transition duration-500 group-hover:scale-105 ${soldOut ? "opacity-50 grayscale" : ""}`}
          />
        ) : null}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          <FreshBadge fresh={product.fresh} />
        </div>
        {product.status !== "sur_commande" && <StatusBadge status={product.status} className="absolute bottom-2 left-2 shadow-sm" />}
      </div>
      <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          {product.category && <p className="text-xs font-semibold tracking-wide text-muted uppercase">{product.category}</p>}
          <h3 className="line-clamp-2 leading-snug font-semibold">
            <Highlight text={product.name} query={query} />
          </h3>
        </div>
        <p className={`shrink-0 font-semibold ${soldOut ? "text-black/40 line-through" : ""}`}>{formatAr(product.pricing.price)}</p>
      </div>
    </Link>
  );
}
