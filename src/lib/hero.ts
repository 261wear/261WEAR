// Données du hero de l'accueil (« Sélectionnées pour vous ») : tout ce qu'il affiche
// est déjà dans la fiche produit et les réglages, rien n'est lu en plus par visiteur.

import { brandLogo } from "./brand-logos";
import { chromaHex } from "./chroma";
import { szwegoUrl } from "./images";
import { formatAr } from "./pricing";
import type { ProductStatus } from "./product-status";
import type { Settings } from "./settings";

export type HeroPair = {
  id: number;
  name: string;
  /** Le mot géant en filigrane : le modèle (« Campus »), pas la marque. */
  ghost: string;
  /** Photo fournisseur, 1000 px. */
  src: string;
  price: string;
  status: ProductStatus;
  /** « 36 → 45 », vide si la fiche n'a pas de pointures. */
  sizes: string;
  /** « 7–14 jours » : délai selon le statut. */
  eta: string;
  /** Référence, à défaut la catégorie. */
  tag: string;
  /** Marque (= catégorie) et son logo SVG quand on l'a. */
  brand: string;
  logo: string | null;
  tone: string;
};

const BRANDS = new Set(["nike", "adidas", "new", "balance", "jordan", "air", "puma", "asics", "keen", "ecco", "the", "north", "face", "converse", "vans", "fila", "reebok", "under", "armour", "off-white", "yeezy"]);

export function ghostWord(name: string): string {
  const words = name.replace(/[«»"'()]/g, " ").split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
  const model = words.find((w) => w.length >= 3 && !BRANDS.has(w.toLowerCase())) ?? words[0] ?? "261";
  return model.slice(0, 9).toUpperCase();
}

function sizeRange(sizes: string[]): string {
  const nums = sizes.map((s) => Number.parseFloat(s)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (nums.length >= 2) return `${nums[0]} → ${nums[nums.length - 1]}`;
  return sizes.join(" · ");
}

type HeroSource = {
  id: number;
  ref: string | null;
  name: string;
  category: string;
  status: ProductStatus;
  sizes: string[];
  images: string[];
  pricing: { price: number };
};

export function toHeroPair(p: HeroSource, s: Settings): HeroPair {
  const stock = p.status === "en_stock";
  return {
    id: p.id,
    name: p.name,
    ghost: ghostWord(p.name),
    src: szwegoUrl(p.images[0], 1000, 82),
    price: formatAr(p.pricing.price),
    status: p.status,
    sizes: sizeRange(p.sizes),
    eta: stock ? `${s.stockDeliveryMinDays}–${s.stockDeliveryMaxDays} jours` : `${s.deliveryMinDays}–${s.deliveryMaxDays} jours`,
    tag: p.ref ?? p.category,
    brand: p.category,
    logo: brandLogo(p.category),
    tone: chromaHex(p.id, p.status),
  };
}
