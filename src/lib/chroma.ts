// Palette « Chroma » : chaque paire a une teinte pastel, stable pour une même fiche.
// Le pistache (vert doux) est réservé à « Dispo de suite » (déjà à Tana) : la couleur dit l'état.
// Les classes sont écrites en toutes lettres pour que Tailwind les détecte.

import type { ProductStatus } from "./product-status";

const PASTEL_CLASS = ["bg-peach", "bg-pink", "bg-sky", "bg-lilac"] as const;
const PASTEL_HEX = ["#ff9f6b", "#ffc1d6", "#8fd3ff", "#c9b8ff"] as const;
const LIME_HEX = "#d9ee8d";

export function chromaClass(id: number, status: ProductStatus): string {
  if (status === "en_stock") return "bg-pistachio";
  if (status === "epuise") return "bg-[#dcd9d2]";
  return PASTEL_CLASS[id % PASTEL_CLASS.length];
}

export function chromaHex(id: number, status: ProductStatus): string {
  if (status === "en_stock") return LIME_HEX;
  return PASTEL_HEX[id % PASTEL_HEX.length];
}
