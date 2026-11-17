// Couleurs des cartes, limitées à celles du moodboard : noir, craie, vert dispo, citron.
// - Sur commande : carte noire, texte craie, prix citron (« prix en citron sur fond noir »).
// - Dispo de suite (déjà à Tana) : cadre Néon du moodboard, carte noire au contour citron doux ;
//   le vert dispo #047857 ne sert qu'à la pastille « Dispo de suite » posée sur la photo.
// - Épuisé : carte craie foncée, texte encre.
// Les classes sont écrites en toutes lettres pour que Tailwind les détecte.

import type { ProductStatus } from "./product-status";

export function chromaClass(_id: number, status: ProductStatus): string {
  if (status === "en_stock") return "bg-ink text-paper ring-2 ring-accent/80 shadow-[0_0_22px_-4px_rgba(198,255,61,0.45)]";
  if (status === "epuise") return "bg-[#dcd9d2] text-ink";
  return "bg-ink text-paper";
}

// Couleur du prix sur la carte.
export function chromaPrice(status: ProductStatus): string {
  return status === "epuise" ? "" : "text-accent";
}

// Fond plein écran du hero : le texte y reste en encre, donc deux tons craie qui alternent d'une paire à l'autre.
const HERO_HEX = ["#f4f2ee", "#e4e0d8"] as const;

export function chromaHex(id: number): string {
  return HERO_HEX[id % HERO_HEX.length];
}
