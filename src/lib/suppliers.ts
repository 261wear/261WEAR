import "server-only";
import { query, queryOne, type Row } from "./db";
import type { HistoryEntry } from "./orders";

export type Supplier = {
  id: number;
  name: string;
  wechat: string;
  phone: string;
  city: string;
  payment: string;
  lead_days: number | null;
  notes: string;
};

export type SupplierWithStats = Supplier & { products: number; toOrder: number; inTransit: number };

export type SupplierInput = Omit<Supplier, "id">;

function toSupplier(r: Row): Supplier {
  return {
    id: r.id,
    name: r.name,
    wechat: r.wechat,
    phone: r.phone,
    city: r.city,
    payment: r.payment,
    lead_days: r.lead_days == null ? null : Number(r.lead_days),
    notes: r.notes,
  };
}

export async function listSuppliers(): Promise<SupplierWithStats[]> {
  const rows = await query(
    `SELECT s.*,
       (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.id)::int AS products,
       (SELECT COUNT(*) FROM orders o JOIN products p ON p.id = o.product_id
          WHERE p.supplier_id = s.id AND o.status = 'paiement_recu' AND NOT o.in_stock)::int AS to_order,
       (SELECT COUNT(*) FROM orders o JOIN products p ON p.id = o.product_id
          WHERE p.supplier_id = s.id AND o.status IN ('commande_fournisseur', 'expedie'))::int AS in_transit
     FROM suppliers s ORDER BY s.name`,
  );
  return rows.map((r) => ({ ...toSupplier(r), products: Number(r.products), toOrder: Number(r.to_order), inTransit: Number(r.in_transit) }));
}

export async function listSupplierOptions() {
  const rows = await query(`SELECT id, name FROM suppliers ORDER BY name`);
  return rows.map((r) => ({ id: r.id as number, name: r.name as string }));
}

export async function getSupplier(id: number) {
  if (!Number.isInteger(id)) return null;
  const row = await queryOne(`SELECT * FROM suppliers WHERE id = $1`, [id]);
  return row ? toSupplier(row) : null;
}

function params(s: SupplierInput) {
  return [s.name, s.wechat, s.phone, s.city, s.payment, s.lead_days, s.notes];
}

export async function createSupplier(s: SupplierInput) {
  const row = await queryOne(
    `INSERT INTO suppliers (name, wechat, phone, city, payment, lead_days, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    params(s),
  );
  return row!.id as number;
}

export async function updateSupplier(id: number, s: SupplierInput) {
  await query(
    `UPDATE suppliers SET name=$1, wechat=$2, phone=$3, city=$4, payment=$5, lead_days=$6, notes=$7 WHERE id = $8`,
    [...params(s), id],
  );
}

export async function deleteSupplier(id: number) {
  await query(`DELETE FROM suppliers WHERE id = $1`, [id]);
}

// Used by the bulk import: link by name (case-insensitive), create if unknown.
export async function findOrCreateSupplier(name: string, cache: Map<string, number>) {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;
  const row = await queryOne(`SELECT id FROM suppliers WHERE LOWER(name) = $1 ORDER BY id LIMIT 1`, [key]);
  const id = row ? (row.id as number) : await createSupplier({ name: name.trim(), wechat: "", phone: "", city: "", payment: "", lead_days: null, notes: "" });
  cache.set(key, id);
  return id;
}

// ---------- Logistics ----------

export type LogisticsLine = {
  orderId: number;
  status: string;
  productId: number | null;
  productName: string;
  productImage: string;
  ref: string | null;
  supplierRef: string;
  size: string;
  qty: number;
  priceRmb: number | null;
  weightKg: number | null;
  customerName: string;
  since: Date; // date the order entered its current status
};

export type SupplierBucket = { supplier: Supplier | null; lines: LogisticsLine[] };

async function linesByStatus(statuses: string[]): Promise<SupplierBucket[]> {
  const rows = await query(
    `SELECT o.id AS order_id, o.status, o.product_id, o.product_name, o.product_image, o.size, o.qty,
            o.customer_name, o.history, o.created_at,
            p.ref, p.supplier_ref, p.price_rmb, p.weight_kg,
            s.id AS s_id, s.name AS s_name, s.wechat AS s_wechat, s.phone AS s_phone, s.city AS s_city,
            s.payment AS s_payment, s.lead_days AS s_lead_days, s.notes AS s_notes
     FROM orders o
     LEFT JOIN products p ON p.id = o.product_id
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE o.status = ANY($1::text[]) AND NOT o.in_stock
     ORDER BY s.name NULLS LAST, o.id`,
    [statuses],
  );
  const buckets = new Map<number | null, SupplierBucket>();
  for (const r of rows) {
    const sid = r.s_id == null ? null : Number(r.s_id);
    if (!buckets.has(sid)) {
      buckets.set(sid, {
        supplier:
          sid == null
            ? null
            : toSupplier({ id: sid, name: r.s_name, wechat: r.s_wechat, phone: r.s_phone, city: r.s_city, payment: r.s_payment, lead_days: r.s_lead_days, notes: r.s_notes }),
        lines: [],
      });
    }
    const history: HistoryEntry[] = JSON.parse(r.history || "[]");
    const entered = [...history].reverse().find((h) => h.status === r.status)?.at;
    buckets.get(sid)!.lines.push({
      orderId: r.order_id,
      status: r.status,
      productId: r.product_id,
      productName: r.product_name,
      productImage: r.product_image,
      ref: r.ref ?? null,
      supplierRef: r.supplier_ref ?? "",
      size: r.size,
      qty: Number(r.qty),
      priceRmb: r.price_rmb == null ? null : Number(r.price_rmb),
      weightKg: r.weight_kg == null ? null : Number(r.weight_kg),
      customerName: r.customer_name,
      since: new Date(entered ?? r.created_at),
    });
  }
  return [...buckets.values()];
}

// Paid orders not yet ordered from the supplier.
export function toOrderBySupplier() {
  return linesByStatus(["paiement_recu"]);
}

// Ordered from the supplier, not yet arrived in Tana.
export function inTransitBySupplier() {
  return linesByStatus(["commande_fournisseur", "expedie"]);
}
