import { thumbUrl } from "@/lib/images";
import Link from "next/link";
import type { CardProduct } from "@/lib/card";
import { formatAr } from "@/lib/pricing";
import { Highlight } from "./Highlight";
import { FreshBadge, StatusBadge } from "./ProductBadges";
import { Img } from "./ui/Img";

export function ProductCard({ product, query = "", priority = false }: { product: CardProduct; query?: string; priority?: boolean }) {
  const soldOut = product.status === "epuise";
  // "Néon" frame from the brand moodboard: pairs already in Tana glow citron (kept soft).
  const neon = product.status === "en_stock";
  return (
    <Link href={`/produit/${product.id}`} className="group block">
      <div className={`relative isolate aspect-square overflow-hidden rounded-2xl bg-card ${neon ? "ring-2 ring-accent shadow-[0_0_18px_rgba(198,255,61,0.28)]" : ""}`}>
        {product.images[0] ? (
          // Landscape supplier photos (3:2, near-white backdrop): zoomed in so the pair
          // fills the square, multiplied so the white melts into the card tone, and
          // faded at the top and bottom edges (no visible seam, supplier "Size" caption
          // softened). The mask stops are relative to the unscaled 3:2 photo box.
          // Portrait studio photos (3:4, grey backdrop, AK CHAUSSURE): cropped to the
          // square around the pair, which sits in the lower half, so the caption at the
          // very bottom falls outside; lightened and warmed so the grey matches the chalk cards.
          <Img
            src={thumbUrl(product.images[0])}
            fallback={product.images[0]}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            className={`h-full w-full scale-[1.25] object-contain mix-blend-multiply transition duration-500 [mask-image:linear-gradient(transparent_16%,black_27%,black_73%,transparent_84%)] group-hover:scale-[1.32] data-[shape=portrait]:scale-[1.1] data-[shape=portrait]:object-cover data-[shape=portrait]:object-[50%_52%] data-[shape=portrait]:brightness-[1.2] data-[shape=portrait]:sepia-[.1] data-[shape=portrait]:[mask-image:none] data-[shape=portrait]:group-hover:scale-[1.16] ${soldOut ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          <span aria-hidden="true" className="font-display absolute inset-0 flex items-center justify-center text-4xl text-black/5">261</span>
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
