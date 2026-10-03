// What a product card needs, nothing more: the catalogue sends these slices to
// the browser as the customer scrolls (see /api/catalogue). A full ShopProduct
// fits this type as is.

import type { Freshness, ProductStatus } from "./product-status";

// Cards per slice: the first is rendered with the page, the next ones load on scroll.
export const CATALOG_SLICE = 24;

export type CardProduct = {
  id: number;
  name: string;
  category: string;
  status: ProductStatus;
  images: string[];
  pricing: { price: number };
  fresh: Freshness;
};

export function toCard(p: CardProduct): CardProduct {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    status: p.status,
    images: p.images.slice(0, 1),
    pricing: { price: p.pricing.price },
    fresh: p.fresh,
  };
}
