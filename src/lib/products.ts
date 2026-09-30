import "server-only";
import { query, queryOne, type Row } from "./db";
import { computePrice, type PriceBreakdown } from "./pricing";
import { getSettings } from "./settings";

export type Product = {
  id: number;
  name: string;
  category: string;
  description: string;
  price_rmb: number;
  weight_kg: number | null;
  margin_pct: number | null;
  price_override: number | null;
  sizes: string[];
  images: string[];
  active: boolean;
};

export type PricedProduct = Product & { pricing: PriceBreakdown };

function toProduct(r: Row): Product {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    description: r.description,
    price_rmb: Number(r.price_rmb),
    weight_kg: r.weight_kg == null ? null : Number(r.weight_kg),
    margin_pct: r.margin_pct == null ? null : Number(r.margin_pct),
    price_override: r.price_override == null ? null : Number(r.price_override),
    sizes: r.sizes ? String(r.sizes).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    images: JSON.parse(r.images || "[]"),
    active: Boolean(r.active),
  };
}

async function withPrices(products: Product[]): Promise<PricedProduct[]> {
  const settings = await getSettings();
  return products.map((p) => ({ ...p, pricing: computePrice(settings, p) }));
}

export async function listProducts({ onlyActive }: { onlyActive: boolean }) {
  const rows = await query(
    `SELECT * FROM products ${onlyActive ? "WHERE active" : ""} ORDER BY created_at DESC, id DESC`,
  );
  return withPrices(rows.map(toProduct));
}

export async function getProduct(id: number) {
  if (!Number.isInteger(id)) return null;
  const row = await queryOne(`SELECT * FROM products WHERE id = $1`, [id]);
  if (!row) return null;
  return (await withPrices([toProduct(row)]))[0];
}

export type ProductInput = Omit<Product, "id">;

function params(p: ProductInput) {
  return [
    p.name,
    p.category,
    p.description,
    p.price_rmb,
    p.weight_kg,
    p.margin_pct,
    p.price_override,
    p.sizes.join(","),
    JSON.stringify(p.images),
    p.active,
  ];
}

export async function createProduct(p: ProductInput) {
  const row = await queryOne(
    `INSERT INTO products (name, category, description, price_rmb, weight_kg, margin_pct,
       price_override, sizes, images, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    params(p),
  );
  return row!.id as number;
}

export async function updateProduct(id: number, p: ProductInput) {
  await query(
    `UPDATE products SET name=$1, category=$2, description=$3, price_rmb=$4, weight_kg=$5,
       margin_pct=$6, price_override=$7, sizes=$8, images=$9, active=$10
     WHERE id = $11`,
    [...params(p), id],
  );
}

export async function deleteProduct(id: number) {
  await query(`DELETE FROM products WHERE id = $1`, [id]);
}
