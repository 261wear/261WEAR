"use server";

import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { listProductsByIds, toProduct, type PricedProduct } from "@/lib/products";
import { computePrice } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";

export type StudioProduct = {
  id: number;
  ref: string | null;
  name: string;
  status: PricedProduct["status"];
  price: number;
  sizes: string[];
  images: string[];
};

function toStudio(p: PricedProduct): StudioProduct {
  return { id: p.id, ref: p.ref, name: p.name, status: p.status, price: p.pricing.price, sizes: p.sizes, images: p.images };
}

// Pairs that can be promoted: on the shop (orderable) and with at least one photo.
// Without a search: the latest ones, pairs already in Tana first.
export async function searchStudioProducts(q: string): Promise<StudioProduct[]> {
  await requireAdmin();
  const words = q.trim().slice(0, 80).split(/\s+/).filter(Boolean).slice(0, 5);
  const params: unknown[] = [];
  const where = words.map((w) => {
    params.push(`%${w.replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
    const i = params.length;
    return `(name ILIKE $${i} OR COALESCE(ref, '') ILIKE $${i} OR category ILIKE $${i})`;
  });
  const rows = await query(
    `SELECT * FROM products
     WHERE status IN ('sur_commande', 'en_stock') AND COALESCE(images, '[]') <> '[]'
     ${where.length ? `AND ${where.join(" AND ")}` : ""}
     ORDER BY ${words.length ? "" : "(status = 'en_stock') DESC, "}COALESCE(published_at, created_at) DESC, id DESC
     LIMIT 30`,
    params,
  );
  const settings = await getSettings();
  return rows.map(toProduct).map((p) => toStudio({ ...p, pricing: computePrice(settings, p) }));
}

export async function getStudioProducts(ids: number[]): Promise<StudioProduct[]> {
  await requireAdmin();
  const found = await listProductsByIds(ids.slice(0, 20));
  return ids.map((id) => found.find((p) => p.id === id)).filter((p) => p !== undefined).map(toStudio);
}
