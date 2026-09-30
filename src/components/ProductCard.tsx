import Link from "next/link";
import type { PricedProduct } from "@/lib/products";
import { formatAr } from "@/lib/pricing";
import { Img } from "./ui/Img";

export function ProductCard({ product }: { product: PricedProduct }) {
  return (
    <Link href={`/produit/${product.id}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-2xl bg-white">
        {product.images[0] ? (
          <Img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="font-display flex h-full items-center justify-center text-4xl text-black/10">261</div>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          {product.category && (
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{product.category}</p>
          )}
          <h3 className="line-clamp-2 font-semibold leading-snug">{product.name}</h3>
        </div>
        <p className="shrink-0 font-semibold">{formatAr(product.pricing.price)}</p>
      </div>
    </Link>
  );
}
