// Bulk import helpers, shared by the browser (preview) and the server (re-validation).

export type ImportRow = {
  line: number;
  ref: string;
  name: string;
  category: string;
  description: string;
  price_rmb: number | null;
  weight_kg: number | null;
  margin_pct: number | null;
  price_override: number | null;
  sizes: string[];
  supplier: string;
  supplier_ref: string;
  errors: string[];
};

export const MAX_IMPORT_ROWS = 500;

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
  | "weight_kg"
  | "margin_pct"
  | "price_override"
  | "sizes"
  | "supplier"
  | "supplier_ref";

const ALIASES: Record<Field, string[]> = {
  ref: ["ref", "reference", "sku", "code", "article", "item", "item_no", "model_no"],
  name: ["nom", "name", "modele", "produit", "titre", "title", "product", "product_name"],
  category: ["categorie", "category", "type"],
  description: ["description", "desc", "caracteristiques", "details"],
  price_rmb: ["prix_rmb", "prixrmb", "rmb", "prix", "prix_fournisseur", "cny", "yuan", "price", "price_rmb", "price_cny", "cost", "unit_price"],
  weight_kg: ["poids_kg", "poids", "weight", "weight_kg", "kg"],
  margin_pct: ["marge", "marge_pct", "margin", "margin_pct"],
  price_override: ["prix_force", "prix_ar", "prix_vente", "prix_mga"],
  sizes: ["pointures", "tailles", "sizes", "taille", "pointure"],
  supplier: ["fournisseur", "supplier", "vendor", "usine", "factory"],
  supplier_ref: ["ref_fournisseur", "reference_fournisseur", "supplier_ref", "supplier_sku", "vendor_sku"],
};

export const TEMPLATE_HEADERS = ["ref", "nom", "categorie", "description", "prix_rmb", "poids_kg", "marge", "prix_force", "pointures", "fournisseur", "ref_fournisseur"];

export const TEMPLATE_EXAMPLE = [
  ["AR261", "Air Runner 261 Black", "Sneakers", "Mesh respirant, semelle cousue", "150", "1,2", "", "", "39 40 41 42 43 44", "Putian Shoes Co", "PT-8821"],
  ["CT-HIGH-W", "Court High White", "Sneakers", "Cuir synthétique premium", "185", "1,4", "40", "", "40 41 42 43", "Guangzhou Kicks", "GZ-114"],
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
  const cleaned = v.replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function parseSizes(v: string) {
  return v
    .split(/[,;/|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

// Validates one row; used as-is by the server on the posted rows.
export function validateRow(r: Omit<ImportRow, "errors">): ImportRow {
  const errors: string[] = [];
  const ref = normalizeRef(r.ref ?? "");
  if (!ref) errors.push("Référence manquante");
  else if (!isValidRef(ref)) errors.push("Référence invalide (lettres, chiffres, - _ . ; 40 max)");
  const name = String(r.name ?? "").trim().slice(0, 120);
  if (!name) errors.push("Nom manquant");
  const numOk = (n: unknown) => n === null || (typeof n === "number" && Number.isFinite(n));
  if (!(typeof r.price_rmb === "number" && r.price_rmb > 0)) errors.push("Prix RMB manquant ou invalide");
  if (!numOk(r.weight_kg) || (r.weight_kg !== null && r.weight_kg <= 0)) errors.push("Poids invalide");
  if (!numOk(r.margin_pct)) errors.push("Marge invalide");
  if (!numOk(r.price_override)) errors.push("Prix forcé invalide");
  return {
    line: r.line,
    ref,
    name,
    category: String(r.category ?? "").trim().slice(0, 60),
    description: String(r.description ?? "").trim().slice(0, 3000),
    price_rmb: r.price_rmb,
    weight_kg: r.weight_kg,
    margin_pct: r.margin_pct,
    price_override: r.price_override === null ? null : Math.round(r.price_override),
    sizes: (Array.isArray(r.sizes) ? r.sizes : []).map(String).slice(0, 30),
    supplier: String(r.supplier ?? "").trim().slice(0, 80),
    supplier_ref: String(r.supplier_ref ?? "").trim().slice(0, 60),
    errors,
  };
}

export function rowsFromText(text: string): { rows: ImportRow[]; missingColumns: string[] } {
  const table = parseTable(text);
  if (table.length < 2) return { rows: [], missingColumns: [] };
  const map = mapColumns(table[0]);
  const missingColumns = (["ref", "name", "price_rmb"] as Field[]).filter((f) => map[f] === undefined);
  if (missingColumns.length) return { rows: [], missingColumns };
  const cell = (row: string[], f: Field) => (map[f] === undefined ? "" : (row[map[f]!] ?? "").trim());
  const rows = table.slice(1, MAX_IMPORT_ROWS + 1).map((row, i) =>
    validateRow({
      line: i + 2,
      ref: cell(row, "ref"),
      name: cell(row, "name"),
      category: cell(row, "category"),
      description: cell(row, "description"),
      price_rmb: parseNumber(cell(row, "price_rmb")),
      weight_kg: parseNumber(cell(row, "weight_kg")),
      margin_pct: parseNumber(cell(row, "margin_pct")),
      price_override: parseNumber(cell(row, "price_override")),
      sizes: parseSizes(cell(row, "sizes")),
      supplier: cell(row, "supplier"),
      supplier_ref: cell(row, "supplier_ref"),
    }),
  );
  // Duplicate references inside the same file.
  const seen = new Map<string, number>();
  for (const r of rows) {
    if (!r.ref) continue;
    if (seen.has(r.ref)) r.errors.push(`Référence en double (ligne ${seen.get(r.ref)})`);
    else seen.set(r.ref, r.line);
  }
  return { rows, missingColumns };
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
