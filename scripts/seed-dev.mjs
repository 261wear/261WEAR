// Creates the local development database (PGlite, ./.data/pglite) if needed
// and fills it with demo sneakers. Run it with the dev server stopped (PGlite
// allows one process):
//   node scripts/seed-dev.mjs
// Then delete .next/dev/cache: the shop keeps a one-day snapshot of the catalogue.
import { PGlite } from "@electric-sql/pglite";
import { SCHEMA } from "../src/lib/schema.ts";

const dir = process.env.PGLITE_DIR || "./.data/pglite";
const db = new PGlite(dir);
for (const statement of SCHEMA) await db.query(statement);
await db.query(
  `INSERT INTO settings (key, value) VALUES ('schema', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
  [String(SCHEMA.length)],
);

// Photos from a supplier catalogue already used by the live shop (szwego).
const photo = (path) => `https://xcimg.szwego.com/img/bc7c1d4c/${path}.jpg`;
const shoes = [
  ["Nike Dunk Low Panda", "Nike", 420, "en_stock", "20260201/i1769961740657_5644_0_0"],
  ["Nike Air Force 1 '07", "Nike", 380, "sur_commande", "20260202/i1769962324790_5034_0_0"],
  ["Adidas Campus 00s", "Adidas", 360, "sur_commande", "20260202/i1769962552161_609_0_0"],
  ["New Balance 530", "New Balance", 340, "en_stock", "20260202/i1769962856032_2103_0_0"],
  ["Nike Air Jordan 1 Low", "Jordan", 460, "sur_commande", "20260202/i1769962962100_453_0_0"],
  ["Adidas Samba OG", "Adidas", 390, "sur_commande", "20260202/i1769963296110_1226_0_0"],
  ["Nike P-6000", "Nike", 400, "en_stock", "20260202/i1769963474777_7277_0_0"],
  ["Asics Gel-1130", "Asics", 370, "sur_commande", "20260202/i1769963742221_6122_0_0"],
  ["New Balance 9060", "New Balance", 520, "sur_commande", "20260202/i1769963881887_6858_0_0"],
  ["Nike Air Max 90", "Nike", 430, "epuise", "20260202/i1769964188694_4818_0_0"],
  ["Puma Speedcat OG", "Puma", 350, "sur_commande", "20260202/i1769964667899_8817_0_0"],
  ["Nike Cortez", "Nike", 330, "en_stock", "20260202/i1769964855362_5205_0_0"],
];

for (const [i, [name, category, priceRmb, status, path]] of shoes.entries()) {
  await db.query(
    `INSERT INTO products (ref, name, category, description, price_rmb, weight_kg, sizes, images, status, active, published_at)
     VALUES ($1, $2, $3, $4, $5, 1.2, $6, $7, $8, $9, NOW() - ($10 || ' hours')::interval)
     ON CONFLICT (ref) DO NOTHING`,
    [
      `DEMO-${String(i + 1).padStart(2, "0")}`,
      name,
      category,
      "Paire de démonstration (base locale).",
      priceRmb,
      "39,40,41,42,43,44",
      JSON.stringify([photo(path)]),
      status,
      status !== "brouillon",
      String(i * 6),
    ],
  );
}
console.log((await db.query(`SELECT COUNT(*)::int AS n FROM products`)).rows[0].n, "produits en base");
await db.close();
