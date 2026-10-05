import "server-only";
import { connection } from "next/server";
import { SCHEMA } from "./schema";
import { hosted } from "./site";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>;

const globalForDb = globalThis as unknown as {
  __db?: Promise<QueryFn>;
};

// The Supabase integration adds its own markers to the URL (?supa=…), which
// Postgres would take for unknown settings: only the SSL mode is kept.
function cleanUrl(url: string) {
  const u = new URL(url);
  const ssl = u.searchParams.get("sslmode");
  u.search = "";
  if (ssl) u.searchParams.set("sslmode", ssl);
  return u.toString();
}

async function createDriver(): Promise<QueryFn> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let query: QueryFn;
  if (url) {
    // Any Postgres (Supabase, Neon…). On Supabase, use the pooler URL (port
    // 6543): it runs in transaction mode, which does not keep prepared statements.
    const { default: postgres } = await import("postgres");
    const sql = postgres(cleanUrl(url), { prepare: false, max: 4, idle_timeout: 20, connect_timeout: 15 });
    query = (text, params = []) => sql.unsafe(text, params as never[]) as unknown as Promise<Row[]>;
  } else {
    if (hosted) {
      throw new Error(
        "DATABASE_URL manquant : ajoutez l'URL Postgres de Supabase (pooler, port 6543) dans les variables d'environnement.",
      );
    }
    // Local development: embedded Postgres stored on disk.
    const { PGlite } = await import("@electric-sql/pglite");
    const { mkdir } = await import("node:fs/promises");
    const dir = process.env.PGLITE_DIR || "./.data/pglite";
    await mkdir(dir, { recursive: true });
    const db = new PGlite(dir);
    query = async (text, params = []) => (await db.query<Row>(text, params)).rows;
  }
  await migrate(query);
  return query;
}

// Every cold start used to replay the whole schema: ~25 round trips that wake
// the database for nothing. The number of statements already applied is kept in
// "settings"; when it matches, one read is enough.
async function migrate(query: QueryFn) {
  const version = String(SCHEMA.length);
  try {
    const rows = await query(`SELECT value FROM settings WHERE key = 'schema'`);
    if (rows[0]?.value === version) return;
  } catch {
    // First start: the settings table does not exist yet.
  }
  // Two servers starting together on an empty database (build workers, cold
  // starts) race on CREATE … IF NOT EXISTS, and Postgres rejects the loser with
  // a duplicate error. Every statement can be replayed: wait, then start over.
  for (let attempt = 1; ; attempt++) {
    try {
      for (const statement of SCHEMA) await query(statement);
      break;
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (attempt >= 5 || !["23505", "42P07", "42710", "40P01"].includes(code ?? "")) throw err;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    }
  }
  await query(
    `INSERT INTO settings (key, value) VALUES ('schema', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [version],
  );
}

function driver() {
  if (!globalForDb.__db) {
    globalForDb.__db = createDriver().catch((err) => {
      globalForDb.__db = undefined;
      throw err;
    });
  }
  return globalForDb.__db;
}

// For reads kept in the Next.js cache (lib/catalog): they run outside a request,
// where connection() is not allowed.
export async function queryStatic(text: string, params: unknown[] = []) {
  const run = await driver();
  return run(text, params);
}

export async function query(text: string, params: unknown[] = []) {
  await connection();
  return queryStatic(text, params);
}

export async function queryOne(text: string, params: unknown[] = []) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}
