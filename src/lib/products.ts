import "server-only";
import { isDbId } from "./orders-shared";
import { query, queryOne, type Row } from "./db";
import { computePrice, type PriceBreakdown } from "./pricing";
import { isProductStatus, type ProductStatus } from "./product-status";
import { getSettings } from "./settings";

export type Product = {
  id: number;
  ref: string | null;
  name: string;
  category: string;
  description: string;
  price_rmb: number | null;
  cost_ar: number | null;
  weight_kg: number | null;
  margin_pct: number | null;
  price_override: number | null;
  sizes: string[];
  images: string[];
  status: ProductStatus;
  active: boolean; // derived: visible on the shop (status is not "brouillon")
  supplier_id: number | null;
  supplier_ref: string;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
};

export type PricedProduct = Product & { pricing: PriceBreakdown };

export function toProduct(r: Row): Product {
  return {
    id: r.id,
    ref: r.ref ?? null,
    name: r.name,
    category: r.category,
    description: r.description,
    price_rmb: r.price_rmb == null ? null : Number(r.price_rmb),
    cost_ar: r.cost_ar == null ? null : Number(r.cost_ar),
    weight_kg: r.weight_kg == null ? null : Number(r.weight_kg),
    margin_pct: r.margin_pct == null ? null : Number(r.margin_pct),
    price_override: r.price_override == null ? null : Number(r.price_override),
    sizes: r.sizes ? String(r.sizes).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    images: JSON.parse(r.images || "[]"),
    status: isProductStatus(r.status) ? r.status : "brouillon",
    active: r.status ? r.status !== "brouillon" : Boolean(r.active),
    supplier_id: r.supplier_id == null ? null : Number(r.supplier_id),
    supplier_ref: r.supplier_ref ?? "",
    created_at: new Date(r.created_at),
    updated_at: new Date(r.updated_at ?? r.created_at),
    published_at: r.published_at ? new Date(r.published_at) : null,
  };
}

async function withPrices(products: Product[]): Promise<PricedProduct[]> {
  const settings = await getSettings();
  return products.map((p) => ({ ...p, pricing: computePrice(settings, p) }));
}

export async function listProducts({ onlyActive }: { onlyActive: boolean }) {
  const rows = await query(
    onlyActive
      ? `SELECT * FROM products WHERE status <> 'brouillon'
         ORDER BY (status = 'epuise'), COALESCE(published_at, created_at) DESC, id DESC`
      : `SELECT * FROM products ORDER BY created_at DESC, id DESC`,
  );
  return withPrices(rows.map(toProduct));
}

export async function getProduct(id: number) {
  if (!isDbId(id)) return null;
  const row = await queryOne(`SELECT * FROM products WHERE id = $1`, [id]);
  if (!row) return null;
  return (await withPrices([toProduct(row)]))[0];
}

export type ProductInput = Omit<Product, "id" | "active" | "created_at" | "updated_at" | "published_at">;

function params(p: ProductInput) {
  return [
    p.ref,
    p.name,
    p.category,
    p.description,
    p.price_rmb,
    p.weight_kg,
    p.margin_pct,
    p.price_override,
    p.sizes.join(","),
    JSON.stringify(p.images),
    p.status,
    p.supplier_id,
    p.supplier_ref,
    p.cost_ar,
  ];
}

export async function createProduct(p: ProductInput) {
  const row = await queryOne(
    `INSERT INTO products (ref, name, category, description, price_rmb, weight_kg, margin_pct,
       price_override, sizes, images, status, active, supplier_id, supplier_ref, cost_ar, updated_at, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, $11 <> 'brouillon', $12,$13,$14, NOW(),
       CASE WHEN $11 <> 'brouillon' THEN NOW() END)
     RETURNING id`,
    params(p),
  );
  return row!.id as number;
}

export async function updateProduct(id: number, p: ProductInput) {
  // updated_at (the public "Mis à jour" badge) only moves when something the
  // customer sees actually changed: re-saving or re-importing identical data does not.
  await query(
    `UPDATE products SET
       updated_at = CASE WHEN (name, category, description, price_rmb, cost_ar, weight_kg, margin_pct, price_override, sizes, status)
         IS DISTINCT FROM ($2::text, $3::text, $4::text, $5::float8, $14::int, $6::float8, $7::float8, $8::int, $9::text, $11::text)
         THEN NOW() ELSE updated_at END,
       ref=$1, name=$2, category=$3, description=$4, price_rmb=$5, weight_kg=$6,
       margin_pct=$7, price_override=$8, sizes=$9, images=$10, status=$11, active = ($11 <> 'brouillon'),
       supplier_id=$12, supplier_ref=$13, cost_ar=$14,
       published_at = COALESCE(published_at, CASE WHEN $11 <> 'brouillon' THEN NOW() END)
     WHERE id = $15`,
    [...params(p), id],
  );
}

export async function deleteProduct(id: number) {
  if (!isDbId(id)) return;
  await query(`DELETE FROM products WHERE id = $1`, [id]);
}

export async function getProductIdByRef(ref: string) {
  const row = await queryOne(`SELECT id FROM products WHERE ref = $1`, [ref]);
  return row ? (row.id as number) : null;
}

export async function setProductImages(id: number, images: string[]) {
  await query(`UPDATE products SET images = $1 WHERE id = $2`, [JSON.stringify(images), id]);
}

// Status change only (bulk publish, quick switch). A change of availability on a
// published product counts as an update ("Mis à jour" badge); publishing a draft does not.
export async function setProductsStatus(ids: number[], status: ProductStatus) {
  if (!ids.length) return;
  await query(
    `UPDATE products SET
       updated_at = CASE WHEN status <> 'brouillon' AND status <> $1 THEN NOW() ELSE updated_at END,
       published_at = COALESCE(published_at, CASE WHEN $1 <> 'brouillon' THEN NOW() END),
       status = $1, active = ($1 <> 'brouillon')
     WHERE id = ANY($2::int[])`,
    [status, ids],
  );
}
