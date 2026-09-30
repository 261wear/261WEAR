import "server-only";
import { randomBytes } from "node:crypto";
import { query, queryOne, type Row } from "./db";

export type HistoryEntry = { status: string; at: string; note?: string };

export type Order = {
  id: number;
  token: string;
  product_id: number | null;
  product_name: string;
  product_image: string;
  size: string;
  qty: number;
  unit_price: number;
  total: number;
  deposit: number;
  amount_paid: number;
  customer_name: string;
  phone: string;
  address: string;
  note: string;
  status: string;
  tracking_ref: string;
  admin_note: string;
  proofs: string[];
  history: HistoryEntry[];
  in_stock: boolean; // product was "Disponible de suite": no China steps
  created_at: Date;
  updated_at: Date;
};

function toOrder(r: Row): Order {
  return {
    ...(r as Order),
    proofs: JSON.parse(r.proofs || "[]"),
    history: JSON.parse(r.history || "[]"),
    in_stock: Boolean(r.in_stock),
    created_at: new Date(r.created_at),
    updated_at: new Date(r.updated_at),
  };
}

export type NewOrder = Pick<
  Order,
  | "product_id"
  | "product_name"
  | "product_image"
  | "size"
  | "qty"
  | "unit_price"
  | "total"
  | "deposit"
  | "customer_name"
  | "phone"
  | "address"
  | "note"
  | "in_stock"
>;

export async function createOrder(o: NewOrder) {
  const token = randomBytes(12).toString("hex");
  const history: HistoryEntry[] = [
    { status: "en_attente_paiement", at: new Date().toISOString() },
  ];
  const row = await queryOne(
    `INSERT INTO orders (token, product_id, product_name, product_image, size, qty, unit_price,
       total, deposit, customer_name, phone, address, note, status, history, in_stock)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'en_attente_paiement',$14,$15)
     RETURNING *`,
    [
      token,
      o.product_id,
      o.product_name,
      o.product_image,
      o.size,
      o.qty,
      o.unit_price,
      o.total,
      o.deposit,
      o.customer_name,
      o.phone,
      o.address,
      o.note,
      JSON.stringify(history),
      o.in_stock,
    ],
  );
  return toOrder(row!);
}

export async function listOrders(status?: string) {
  const rows = status
    ? await query(`SELECT * FROM orders WHERE status = $1 ORDER BY id DESC`, [status])
    : await query(`SELECT * FROM orders ORDER BY id DESC LIMIT 500`);
  return rows.map(toOrder);
}

export async function countByStatus() {
  const rows = await query(`SELECT status, COUNT(*)::int AS n FROM orders GROUP BY status`);
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Record<string, number>;
}

export async function getOrder(id: number) {
  if (!Number.isInteger(id)) return null;
  const row = await queryOne(`SELECT * FROM orders WHERE id = $1`, [id]);
  return row ? toOrder(row) : null;
}

export async function getOrderByToken(token: string) {
  if (!/^[a-f0-9]{24}$/.test(token)) return null;
  const row = await queryOne(`SELECT * FROM orders WHERE token = $1`, [token]);
  return row ? toOrder(row) : null;
}

export async function updateOrder(
  id: number,
  fields: Partial<Pick<Order, "status" | "amount_paid" | "tracking_ref" | "admin_note" | "proofs" | "history">>,
) {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(fields)) {
    values.push(key === "proofs" || key === "history" ? JSON.stringify(value) : value);
    sets.push(`${key} = $${values.length}`);
  }
  if (!sets.length) return;
  values.push(id);
  await query(
    `UPDATE orders SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${values.length}`,
    values,
  );
}

// Date the deposit was received, used for delivery estimates.
export function paidAt(o: Order) {
  const entry = o.history.find((h) => h.status === "paiement_recu");
  return entry ? new Date(entry.at) : null;
}
