import { thumbUrl } from "@/lib/images";
import Link from "next/link";
import type { CardProduct } from "@/lib/card";
import { chromaClass } from "@/lib/chroma";
import { formatAr } from "@/lib/pricing";
import { Highlight } from "./Highlight";
import { BoltIcon } from "./icons";
import { CARD_PHOTO } from "./cardPhoto";
import { Img } from "./ui/Img";

// Carte « Chroma » : une teinte pastel par paire (pistache = déjà à Tana), la photo dans
// sa plaque claire, puis marque, nom et prix. Pas de pastilles ni de bouton rond : l'état
// (nouveau, mis à jour, dispo de suite, épuisé) s'écrit en clair sur une ligne, en encre
// pleine pour rester lisible sur toutes les teintes (la carte fixe sa couleur de texte,
// elle ne dépend pas de la section où elle est posée).
export function ProductCard({ product, query = "", priority = false }: { product: CardProduct; query?: string; priority?: boolean }) {
  const soldOut = product.status === "epuise";
  const mark =
    product.status === "en_stock" ? (
      <span className="inline-flex items-center gap-1 font-bold">
        <BoltIcon size={14} /> Dispo de suite
      </span>
    ) : soldOut ? (
      <span className="font-bold">Épuisé</span>
    ) : product.fresh === "nouveau" ? (
      <span className="font-bold">Nouveau</span>
    ) : product.fresh === "mis_a_jour" ? (
      <span className="font-bold">Mis à jour</span>
    ) : null;
  return (
    <Link href={`/produit/${product.id}`} className="group block text-ink">
      <article className={`rounded-[28px] p-2.5 transition duration-300 ease-out motion-safe:group-hover:-translate-y-1.5 ${chromaClass(product.id, product.status)}`}>
        <div className="relative isolate aspect-square overflow-hidden rounded-[20px] bg-card">
          {product.images[0] ? (
            // Cadrage partagé avec le sélecteur du Studio : voir cardPhoto.ts.
            <Img
              src={thumbUrl(product.images[0])}
              fallback={product.images[0]}
              alt={product.name}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              className={`${CARD_PHOTO} ${soldOut ? "opacity-50 grayscale" : ""}`}
            />
          ) : (
            <span aria-hidden="true" className="font-display absolute inset-0 flex items-center justify-center text-4xl text-black/5">261</span>
          )}
        </div>
        <div className="px-2 pt-3 pb-2">
          <h3 className="font-display line-clamp-2 text-[17px] leading-tight font-bold">
            <Highlight text={product.name} query={query} />
          </h3>
          <p className="mt-1 flex items-center gap-x-2 text-[13px] text-ink/80">
            {product.category && <span className="truncate">{product.category}</span>}
            {product.category && mark && <span aria-hidden="true">·</span>}
            {mark && <span className="shrink-0 text-ink">{mark}</span>}
          </p>
          <p className={`font-display mt-2 text-2xl leading-none ${soldOut ? "text-ink/50 line-through" : ""}`}>{formatAr(product.pricing.price)}</p>
        </div>
      </article>
    </Link>
  );
}
