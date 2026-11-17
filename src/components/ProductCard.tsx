import { thumbUrl } from "@/lib/images";
import Link from "next/link";
import type { CardProduct } from "@/lib/card";
import { chromaClass, chromaPrice } from "@/lib/chroma";
import { formatAr } from "@/lib/pricing";
import { Highlight } from "./Highlight";
import { BoltIcon } from "./icons";
import { FreshBadge } from "./ProductBadges";
import { CARD_PHOTO } from "./cardPhoto";
import { Img } from "./ui/Img";

// Carte du moodboard : fond noir, nom du modèle en Anton, prix en citron (cadre Ticket).
// Paire déjà à Tana : cadre Néon (contour citron doux) et pastille verte « Dispo de suite » sur la photo.
// La carte fixe sa couleur de texte : elle ne dépend pas de la section où elle est posée (voir chroma.ts).
export function ProductCard({ product, query = "", priority = false }: { product: CardProduct; query?: string; priority?: boolean }) {
  const soldOut = product.status === "epuise";
  const inStock = product.status === "en_stock";
  // « Dispo de suite » et « New » sont posés sur la photo (pastille verte du cadre Néon, badge citron du Ticket).
  const mark =
    inStock ? null : soldOut ? (
      <span className="font-bold">Épuisé</span>
    ) : product.fresh === "mis_a_jour" ? (
      <span className="font-bold">Mis à jour</span>
    ) : null;
  // Le prix tient toujours sur une ligne : sa taille suit la largeur de la carte (container query),
  // à raison d'environ 0,55 em par caractère en Inter extra-gras, et baisse encore pour les prix longs.
  const price = formatAr(product.pricing.price);
  const priceSize = `clamp(0.875rem, ${(170 / Math.max(price.length, 10)).toFixed(1)}cqi, 1.5rem)`;
  return (
    <Link href={`/produit/${product.id}`} className="group block">
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
          {product.fresh === "nouveau" && !soldOut && <FreshBadge fresh="nouveau" className="absolute top-2.5 left-2.5 z-10" />}
          {inStock && (
            <span className="absolute bottom-2.5 left-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-dispo px-2.5 py-1 text-[11px] leading-none font-semibold text-paper">
              <BoltIcon size={12} /> Dispo de suite
            </span>
          )}
        </div>
        <div className="@container px-2 pt-3 pb-2">
          {/* Nom du modèle en Anton, comme le cadre Ticket du moodboard. */}
          <h3 className="font-display line-clamp-2 text-[19px] leading-tight">
            <Highlight text={product.name} query={query} />
          </h3>
          <p className="mt-1 flex items-center gap-x-2 text-[13px] opacity-80">
            {product.category && <span className="truncate">{product.category}</span>}
            {product.category && mark && <span aria-hidden="true">·</span>}
            {mark && <span className="shrink-0">{mark}</span>}
          </p>
          <p style={{ fontSize: priceSize }} className={`mt-2 leading-none font-extrabold tracking-tight whitespace-nowrap ${soldOut ? "opacity-50 line-through" : chromaPrice(product.status)}`}>{price}</p>
        </div>
      </article>
    </Link>
  );
}
