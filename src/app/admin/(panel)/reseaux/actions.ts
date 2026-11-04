"use server";

import { requireAdmin } from "@/lib/auth";
import { shopProducts } from "@/lib/catalog";
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
// With a search (without one, see suggestStudioProducts).
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

export type SuggestMode = "mix" | "stock" | "new";

const SUGGESTIONS = 12;
const NEWEST = 150; // "Nouveautés": drawn from the latest pairs put online

function shuffle<T>(a: T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Pairs to promote, drawn at random on every call so each visit (or « Autres
// paires ») shows a new selection. Read from the shop's cached snapshot: no
// database read, so no Supabase egress however often it is refreshed.
// mix: up to 3 pairs already in Tana, then half recent pairs, half the whole catalogue.
export async function suggestStudioProducts(mode: SuggestMode = "mix", exclude: number[] = []): Promise<StudioProduct[]> {
  await requireAdmin();
  const skip = new Set(exclude);
  const all = (await shopProducts()).filter(
    (p) => (p.status === "sur_commande" || p.status === "en_stock") && p.images.length && !skip.has(p.id),
  );
  const stock = all.filter((p) => p.status === "en_stock");
  const newest = all.filter((p) => p.status !== "en_stock").slice(0, NEWEST); // the snapshot is sorted newest first
  let picked: typeof all;
  if (mode === "stock") picked = shuffle(stock);
  else if (mode === "new") picked = shuffle(newest);
  else {
    const head = shuffle(stock).slice(0, 3);
    const taken = new Set(head.map((p) => p.id));
    const fresh = shuffle(newest).filter((p) => !taken.has(p.id)).slice(0, Math.ceil((SUGGESTIONS - head.length) / 2));
    fresh.forEach((p) => taken.add(p.id));
    const rest = shuffle(all.filter((p) => !taken.has(p.id) && p.status !== "en_stock")).slice(0, SUGGESTIONS - head.length - fresh.length);
    picked = [...head, ...shuffle([...fresh, ...rest])];
  }
  return picked.slice(0, SUGGESTIONS).map(toStudio);
}

export async function getStudioProducts(ids: number[]): Promise<StudioProduct[]> {
  await requireAdmin();
  const found = await listProductsByIds(ids.slice(0, 20));
  return ids.map((id) => found.find((p) => p.id === id)).filter((p) => p !== undefined).map(toStudio);
}
