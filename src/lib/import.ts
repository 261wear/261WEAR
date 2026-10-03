// Bulk import helpers, shared by the browser (preview) and the server (re-validation).

import { isAllowedImageUrl, MAX_IMAGES, productIssues, type ProductCore } from "./product-rules";
import { isProductStatus, type ProductStatus } from "./product-status";

export type ImportRow = {
  line: number;
  ref: string;
  name: string;
  category: string;
  description: string;
  price_rmb: number | null;
  cost_ar: number | null;
  weight_kg: number | null;
  margin_pct: number | null;
  price_override: number | null;
  sizes: string[];
  supplier: string;
  supplier_ref: string;
  status: ProductStatus | null; // null = keep current / use the default
  images: string[]; // photo links (https), e.g. a supplier catalogue; empty = keep current
  errors: string[];
};

// A whole supplier catalogue fits in one file; the browser sends it to the
// server in small batches, each capped at MAX_IMPORT_BATCH.
export const MAX_IMPORT_ROWS = 10_000;
export const MAX_IMPORT_BATCH = 500;

const REF_RE = /^[A-Z0-9][A-Z0-9._-]{0,39}$/;

export function normalizeRef(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "-");
}

export function isValidRef(ref: string) {
  return REF_RE.test(ref);
}

// ---------- Table parsing (CSV, semicolon CSV from French Excel, or pasted TSV) ----------

function detectDelimiter(firstLine: string) {
  const counts = ["\t", ";", ","].map((d) => [d, firstLine.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

export function parseTable(text: string): string[][] {
  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const delimiter = detectDelimiter(src.split("\n", 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// ---------- Column mapping ----------

type Field =
  | "ref"
  | "name"
  | "category"
  | "description"
  | "price_rmb"
  | "cost_ar"
  | "weight_kg"
  | "margin_pct"
  | "price_override"
  | "sizes"
  | "supplier"
  | "supplier_ref"
  | "status"
  | "images";

const ALIASES: Record<Field, string[]> = {
  ref: ["ref", "reference", "sku", "code", "article", "item", "item_no", "model_no"],
  name: ["nom", "name", "modele", "produit", "titre", "title", "product", "product_name"],
  category: ["categorie", "category", "type"],
  description: ["description", "desc", "caracteristiques", "details"],
  price_rmb: ["prix_rmb", "prixrmb", "rmb", "prix", "prix_fournisseur", "cny", "yuan", "price", "price_rmb", "price_cny", "cost", "unit_price"],
  cost_ar: ["prix_achat_ar", "prix_achat", "prix_achat_mga", "cout_ar", "achat_ar", "cost_ar", "purchase_price", "cout"],
  weight_kg: ["poids_kg", "poids", "weight", "weight_kg", "kg"],
  margin_pct: ["marge", "marge_pct", "margin", "margin_pct"],
  price_override: ["prix_force", "prix_ar", "prix_vente", "prix_mga"],
  sizes: ["pointures", "tailles", "sizes", "taille", "pointure"],
  supplier: ["fournisseur", "supplier", "vendor", "usine", "factory"],
  supplier_ref: ["ref_fournisseur", "reference_fournisseur", "supplier_ref", "supplier_sku", "vendor_sku"],
  status: ["statut", "status", "disponibilite", "dispo", "availability", "etat"],
  images: ["photos", "images", "liens_photos", "image_urls", "photo_urls"],
};

const STATUS_WORDS: [ProductStatus, string[]][] = [
  ["sur_commande", ["sur commande", "commande", "precommande", "pre-commande", "on order", "preorder"]],
  ["en_stock", ["disponible de suite", "dispo de suite", "en stock", "stock", "disponible", "dispo", "in stock", "immediat"]],
  ["epuise", ["epuise", "epuisee", "rupture", "rupture de stock", "sold out", "out of stock"]],
  ["brouillon", ["brouillon", "draft", "masque", "non publie", "cache"]],
];

// Returns undefined when the value is not understood.
export function parseStatus(value: string): ProductStatus | null | undefined {
  const k = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/_/g, " ").trim();
  if (!k) return null;
  for (const [id, words] of STATUS_WORDS) if (id.replace("_", " ") === k || words.includes(k)) return id;
  return undefined;
}

export const TEMPLATE_HEADERS = ["ref", "nom", "categorie", "description", "statut", "prix_rmb", "prix_achat_ar", "poids_kg", "marge", "prix_force", "pointures", "fournisseur", "ref_fournisseur"];

export const TEMPLATE_EXAMPLE = [
  ["AR261", "Air Runner 261 Black", "Sneakers", "Mesh respirant, semelle cousue", "sur commande", "150", "", "1,2", "", "", "39 40 41 42 43 44", "Putian Shoes Co", "PT-8821"],
  ["CT-HIGH-W", "Court High White", "Sneakers", "Cuir synthétique premium", "en stock", "", "210000", "", "40", "", "40 41 42 43", "Guangzhou Kicks", "GZ-114"],
];

function key(header: string) {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .trim()
    .replace(/[\s-]+/g, "_");
}

export function mapColumns(headers: string[]) {
  const map: Partial<Record<Field, number>> = {};
  headers.forEach((h, i) => {
    const k = key(h);
    for (const [field, aliases] of Object.entries(ALIASES) as [Field, string[]][]) {
      if (map[field] === undefined && aliases.includes(k)) map[field] = i;
    }
  });
  return map;
}

function parseNumber(v: string): number | null | typeof NaN {
  if (!v.trim()) return null;
  const cleaned = v.replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!cleaned) return NaN; // something was written, but no number in it
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function parseSizes(v: string) {
  return v
    .replace(/\b(\d{2}),(5)\b/g, "$1.$2") // half sizes written the French way: 42,5
    .split(/[,;/|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Photo links separated by spaces, "|" or new lines; only https links are kept.
function parseImages(v: string) {
  return v.split(/[\s|]+/).filter(Boolean);
}

// Ariary amounts: "180 000", "180.000", "180,000 Ar", "180 000,00" → 180000.
function parseAr(v: string): number | null {
  const t = v.trim().replace(/[.,]\d{1,2}$/, "");
  if (!t) return null;
  const digits = t.replace(/[^\d-]/g, "");
  if (!digits || digits === "-") return NaN;
  const n = Number(digits);
  return Number.isFinite(n) ? n : NaN;
}

// Format checks of one row (what the file says). Required fields depend on
// whether the reference already exists: see resolveRow.
export function validateRow(r: Omit<ImportRow, "errors">): ImportRow {
  const errors: string[] = [];
  const ref = normalizeRef(String(r.ref ?? ""));
  if (!ref) errors.push("Référence manquante");
  else if (!isValidRef(ref)) errors.push("Référence invalide (lettres, chiffres, - _ . ; 40 max)");
  // NaN = a value was given but is not a number: report it once, then drop it.
  const num = (n: unknown, label: string) => {
    if (n === null || n === undefined) return null;
    if (typeof n === "number" && Number.isFinite(n)) return n;
    errors.push(`${label} : valeur illisible`);
    return null;
  };
  const status = r.status == null ? null : isProductStatus(r.status) ? r.status : (errors.push("Statut invalide"), null);
  return {
    line: Number(r.line) || 0,
    ref,
    name: String(r.name ?? "").trim().slice(0, 120),
    category: String(r.category ?? "").trim().slice(0, 60),
    description: String(r.description ?? "").trim().slice(0, 3000),
    price_rmb: num(r.price_rmb, "Prix RMB"),
    cost_ar: (() => {
      const n = num(r.cost_ar, "Prix d'achat Ar");
      return n === null ? null : Math.round(n);
    })(),
    weight_kg: num(r.weight_kg, "Poids"),
    margin_pct: num(r.margin_pct, "Marge"),
    price_override: (() => {
      const n = num(r.price_override, "Prix forcé");
      return n === null ? null : Math.round(n);
    })(),
    sizes: (Array.isArray(r.sizes) ? r.sizes : []).map(String).map((x) => x.trim()).filter(Boolean),
    supplier: String(r.supplier ?? "").trim().slice(0, 80),
    supplier_ref: String(r.supplier_ref ?? "").trim().slice(0, 60),
    status,
    images: (Array.isArray(r.images) ? r.images : [])
      .map(String)
      .filter(isAllowedImageUrl)
      .filter((u, i, all) => all.indexOf(u) === i)
      .slice(0, MAX_IMAGES),
    errors,
  };
}

// What the import needs to know about a product that already has this reference.
export type ImportExisting = ProductCore & { category: string; description: string };

export type ResolvedRow = { product: ImportExisting; isNew: boolean; errors: string[] };

// Merges a row into the existing product: an empty cell keeps the current
// value, so a file with only "ref;statut" is enough to update availability.
// The merged product is then checked with the same rules as the product form.
export function resolveRow(row: ImportRow, existing: ImportExisting | undefined, defaultStatus: ProductStatus): ResolvedRow {
  const price_rmb = row.price_rmb ?? existing?.price_rmb ?? null;
  const cost_ar = row.cost_ar ?? existing?.cost_ar ?? null;
  // New product without a status: between the two sellable statuses, follow the
  // price given (only a price in Ar = stock in Tana, only RMB = to order).
  let fallback = defaultStatus;
  if (defaultStatus === "sur_commande" && price_rmb === null && cost_ar !== null) fallback = "en_stock";
  if (defaultStatus === "en_stock" && cost_ar === null && price_rmb !== null) fallback = "sur_commande";
  const product: ImportExisting = {
    name: row.name || existing?.name || "",
    category: row.category || existing?.category || "",
    description: row.description || existing?.description || "",
    status: row.status ?? existing?.status ?? fallback,
    price_rmb,
    cost_ar,
    weight_kg: row.weight_kg ?? existing?.weight_kg ?? null,
    margin_pct: row.margin_pct ?? existing?.margin_pct ?? null,
    price_override: row.price_override ?? existing?.price_override ?? null,
    sizes: row.sizes.length ? row.sizes : (existing?.sizes ?? []),
  };
  const errors = row.errors.length ? row.errors : productIssues(product);
  return { product, isNew: !existing, errors };
}

export function rowsFromText(text: string): { rows: ImportRow[]; missingColumns: string[]; ignored: number } {
  const table = parseTable(text);
  if (table.length < 2) return { rows: [], missingColumns: [], ignored: 0 };
  const map = mapColumns(table[0]);
  const missingColumns = (["ref"] as Field[]).filter((f) => map[f] === undefined);
  if (missingColumns.length) return { rows: [], missingColumns, ignored: 0 };
  const cell = (row: string[], f: Field) => (map[f] === undefined ? "" : (row[map[f]!] ?? "").trim());
  const body = table.slice(1, MAX_IMPORT_ROWS + 1);
  const rows = body.map((row, i) =>
    validateRow({
      line: i + 2,
      ref: cell(row, "ref"),
      name: cell(row, "name"),
      category: cell(row, "category"),
      description: cell(row, "description"),
      price_rmb: parseNumber(cell(row, "price_rmb")),
      cost_ar: parseAr(cell(row, "cost_ar")),
      weight_kg: parseNumber(cell(row, "weight_kg")),
      margin_pct: parseNumber(cell(row, "margin_pct")),
      price_override: parseAr(cell(row, "price_override")),
      sizes: parseSizes(cell(row, "sizes")),
      supplier: cell(row, "supplier"),
      supplier_ref: cell(row, "supplier_ref"),
      status: parseStatus(cell(row, "status")) ?? null,
      images: parseImages(cell(row, "images")),
    }),
  );
  // Unknown status words are reported, not silently ignored.
  body.forEach((row, i) => {
    const raw = cell(row, "status");
    if (raw && parseStatus(raw) === undefined) rows[i].errors.push(`Statut inconnu « ${raw} » (sur commande, en stock, épuisé, brouillon)`);
  });
  // Duplicate references inside the same file.
  const seen = new Map<string, number>();
  for (const r of rows) {
    if (!r.ref) continue;
    if (seen.has(r.ref)) r.errors.push(`Référence en double (ligne ${seen.get(r.ref)})`);
    else seen.set(r.ref, r.line);
  }
  return { rows, missingColumns, ignored: Math.max(0, table.length - 1 - MAX_IMPORT_ROWS) };
}

// ---------- Photo ↔ product matching by file name ----------
// "AR261.jpg", "AR261-2.jpg", "ar261_3.png", "AR261 (4).webp" → ref AR261.

export type ImageMatch = { ref: string | null; order: number };

export function matchImage(fileName: string, refs: string[]): ImageMatch {
  const base = normalizeRef(fileName.replace(/^.*[\\/]/, "").replace(/\.[a-z0-9]+$/i, ""));
  let best: string | null = null;
  for (const ref of refs) {
    if (base === ref || (base.startsWith(ref) && /^[-_.(]/.test(base.slice(ref.length)))) {
      if (!best || ref.length > best.length) best = ref;
    }
  }
  if (!best) return { ref: null, order: 0 };
  const suffix = base.slice(best.length).match(/(\d+)/);
  return { ref: best, order: suffix ? Number(suffix[1]) : 0 };
}
