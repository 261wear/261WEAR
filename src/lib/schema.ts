// Database schema, replayed in order on startup (see migrate in db.ts).
// Kept apart from db.ts so scripts (scripts/seed-dev.mjs) can use it outside Next.js.
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    price_rmb DOUBLE PRECISION NOT NULL,
    weight_kg DOUBLE PRECISION,
    margin_pct DOUBLE PRECISION,
    price_override INTEGER,
    sizes TEXT NOT NULL DEFAULT '',
    images TEXT NOT NULL DEFAULT '[]',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    product_image TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    qty INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL,
    total INTEGER NOT NULL,
    deposit INTEGER NOT NULL,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    tracking_ref TEXT NOT NULL DEFAULT '',
    admin_note TEXT NOT NULL DEFAULT '',
    proofs TEXT NOT NULL DEFAULT '[]',
    history TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status)`,
  // Supplier / catalogue reference, used by bulk import to match rows and photos.
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS ref TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS products_ref_idx ON products (ref)`,
  `CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    wechat TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    payment TEXT NOT NULL DEFAULT '',
    lead_days INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers (id) ON DELETE SET NULL`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_ref TEXT NOT NULL DEFAULT ''`,
  // Availability status (replaces the old online/hidden switch, kept in sync in "active").
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT`,
  `UPDATE products SET status = CASE WHEN active THEN 'sur_commande' ELSE 'brouillon' END WHERE status IS NULL`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`,
  `UPDATE products SET updated_at = created_at WHERE updated_at IS NULL`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`,
  `UPDATE products SET published_at = created_at WHERE published_at IS NULL AND active`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS in_stock BOOLEAN NOT NULL DEFAULT FALSE`,
  // Purchase price in Ariary for stock already in Tana; RMB price becomes optional.
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_ar INTEGER`,
  `ALTER TABLE products ALTER COLUMN price_rmb DROP NOT NULL`,
  // Large catalogues: lists filter by status and sort by date.
  `CREATE INDEX IF NOT EXISTS products_status_idx ON products (status, published_at DESC)`,
  `CREATE INDEX IF NOT EXISTS products_created_idx ON products (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS fb_posts (
    id SERIAL PRIMARY KEY,
    fb_post_id TEXT,
    message TEXT NOT NULL,
    product_ids TEXT NOT NULL DEFAULT '[]',
    photo_count INTEGER NOT NULL DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    status TEXT NOT NULL,
    error TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
];
