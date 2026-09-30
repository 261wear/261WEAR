import Link from "next/link";
import type { ShopProduct } from "@/lib/catalog";
import { formatAr } from "@/lib/pricing";
import { Highlight } from "./Highlight";
import { FreshBadge, StatusBadge } from "./ProductBadges";
import { Img } from "./ui/Img";

export function ProductCard({ product, query = "" }: { product: ShopProduct; query?: string }) {
  const soldOut = product.status === "epuise";
  return (
    <Link href={`/produit/${product.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
        {product.images[0] ? (
          <Img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${soldOut ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          <div className="font-display flex h-full items-center justify-center text-4xl text-black/10">261</div>
        )}
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
