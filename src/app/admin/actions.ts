"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { createOrder, getOrder, updateOrder } from "@/lib/orders";
import { ALL_STATUS_IDS, normalizePhone } from "@/lib/orders-shared";
import { depositFor } from "@/lib/pricing";
import { isValidRef, MAX_IMPORT_ROWS, normalizeRef, validateRow, type ImportRow } from "@/lib/import";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProductIdByRef,
  setProductImages,
  setProductsActive,
  updateProduct,
  type ProductInput,
} from "@/lib/products";
import { getSettings, saveSettings, type Settings } from "@/lib/settings";

export type FormState = { error?: string; ok?: string } | undefined;

function str(form: FormData, key: string, max = 2000) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function num(form: FormData, key: string): number | null {
  const raw = str(form, key).replace(/\s/g, "").replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

// ---------- Session ----------

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  if (!checkPassword(str(form, "password", 200))) return { error: "Mot de passe incorrect." };
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

// ---------- Products ----------

export async function saveProduct(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const priceRmb = num(form, "price_rmb");
  const weight = num(form, "weight_kg");
  const margin = num(form, "margin_pct");
  const override = num(form, "price_override");

  let images: string[] = [];
  try {
    images = JSON.parse(str(form, "images", 20000) || "[]");
  } catch {
    return { error: "Images invalides." };
  }

  const ref = normalizeRef(str(form, "ref", 60));
  if (ref && !isValidRef(ref)) return { error: "Référence invalide (lettres, chiffres, - _ .)." };
  if (ref) {
    const owner = await getProductIdByRef(ref);
    if (owner && owner !== id) return { error: `La référence ${ref} est déjà utilisée par un autre produit.` };
  }

  const input: ProductInput = {
    ref: ref || null,
    name: str(form, "name", 120),
    category: str(form, "category", 60),
    description: str(form, "description", 3000),
    price_rmb: priceRmb ?? NaN,
    weight_kg: weight,
    margin_pct: margin,
    price_override: override ? Math.round(override) : null,
    sizes: str(form, "sizes", 300).split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean),
    images: images.filter((u) => typeof u === "string").slice(0, 12),
    active: form.get("active") === "on",
  };

  if (!input.name) return { error: "Le nom est obligatoire." };
  if (!(input.price_rmb > 0)) return { error: "Le prix en RMB doit être un nombre positif." };
  if (weight !== null && !(weight > 0)) return { error: "Poids invalide." };
  if (margin !== null && Number.isNaN(margin)) return { error: "Marge invalide." };
  if (override !== null && Number.isNaN(override)) return { error: "Prix forcé invalide." };

  if (id) await updateProduct(id, input);
  else await createProduct(input);
  revalidatePath("/", "layout");
  redirect("/admin/produits");
}

export async function toggleProduct(form: FormData) {
  await requireAdmin();
  const product = await getProduct(Number(form.get("id")));
  if (!product) return;
  const { id, pricing, ...rest } = product;
  void pricing;
  await updateProduct(id, { ...rest, active: !product.active });
  revalidatePath("/", "layout");
}

export async function removeProduct(form: FormData) {
  await requireAdmin();
  await deleteProduct(Number(form.get("id")));
  revalidatePath("/", "layout");
  redirect("/admin/produits");
}

// ---------- Bulk import ----------

export type ImportResult = { created: number; updated: number; skipped: { line: number; ref: string; errors: string[] }[] };

// Step 1: product sheets. Rows are matched on their reference: an existing
// reference is updated (photos and online status kept), a new one is created.
export async function importProducts(rows: ImportRow[], publish: boolean): Promise<ImportResult> {
  await requireAdmin();
  const result: ImportResult = { created: 0, updated: 0, skipped: [] };
  if (!Array.isArray(rows)) return result;
  const seen = new Set<string>();
  for (const raw of rows.slice(0, MAX_IMPORT_ROWS)) {
    const row = validateRow(raw);
    if (!row.errors.length && seen.has(row.ref)) row.errors.push("Référence en double");
    if (row.errors.length) {
      result.skipped.push({ line: row.line, ref: row.ref, errors: row.errors });
      continue;
    }
    seen.add(row.ref);
    const fields = {
      ref: row.ref,
      name: row.name,
      category: row.category,
      description: row.description,
      price_rmb: row.price_rmb!,
      weight_kg: row.weight_kg,
      margin_pct: row.margin_pct,
      price_override: row.price_override,
      sizes: row.sizes,
    };
    const existingId = await getProductIdByRef(row.ref);
    const existing = existingId ? await getProduct(existingId) : null;
    if (existing) {
      await updateProduct(existing.id, { ...fields, images: existing.images, active: existing.active || publish });
      result.updated++;
    } else {
      await createProduct({ ...fields, images: [], active: publish });
      result.created++;
    }
  }
  revalidatePath("/", "layout");
  return result;
}

// Step 2: attach uploaded photos to a product (in the given order).
export async function attachProductImages(productId: number, urls: string[], replace: boolean) {
  await requireAdmin();
  const product = await getProduct(productId);
  if (!product || !Array.isArray(urls)) return;
  const clean = urls.filter((u) => typeof u === "string" && u);
  const images = [...(replace ? [] : product.images), ...clean].slice(0, 12);
  await setProductImages(product.id, images);
  revalidatePath("/", "layout");
}

export async function publishProducts(ids: number[]) {
  await requireAdmin();
  await setProductsActive(ids.filter(Number.isInteger), true);
  revalidatePath("/", "layout");
}

// ---------- Orders ----------

export async function setOrderStatus(form: FormData) {
  await requireAdmin();
  const order = await getOrder(Number(form.get("id")));
  const status = str(form, "status", 40);
  if (!order || !ALL_STATUS_IDS.includes(status)) return;
  const note = str(form, "note", 200);
  const history = [...order.history, { status, at: new Date().toISOString(), ...(note ? { note } : {}) }];
  await updateOrder(order.id, { status, history });
  revalidatePath("/admin", "layout");
}

export async function saveOrderDetails(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const order = await getOrder(Number(form.get("id")));
  if (!order) return { error: "Commande introuvable." };
  const paid = num(form, "amount_paid");
  if (paid === null || Number.isNaN(paid) || paid < 0) return { error: "Montant payé invalide." };
  await updateOrder(order.id, {
    amount_paid: Math.round(paid),
    tracking_ref: str(form, "tracking_ref", 100),
    admin_note: str(form, "admin_note", 2000),
  });
  revalidatePath("/admin", "layout");
  return { ok: "Enregistré." };
}

export async function addProof(orderId: number, url: string) {
  await requireAdmin();
  const order = await getOrder(orderId);
  if (!order || typeof url !== "string" || !url) return;
  await updateOrder(order.id, { proofs: [...order.proofs, url] });
  revalidatePath(`/admin/commandes/${order.id}`);
}

export async function removeProof(form: FormData) {
  await requireAdmin();
  const order = await getOrder(Number(form.get("id")));
  if (!order) return;
  const url = str(form, "url");
  await updateOrder(order.id, { proofs: order.proofs.filter((p) => p !== url) });
  revalidatePath(`/admin/commandes/${order.id}`);
}

export async function createManualOrder(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const product = await getProduct(Number(form.get("productId")));
  if (!product) return { error: "Choisissez un produit." };
  const phone = normalizePhone(str(form, "phone", 30));
  const name = str(form, "name", 80);
  if (name.length < 2) return { error: "Nom du client obligatoire." };
  if (!/^2613\d{8}$/.test(phone)) return { error: "Numéro invalide (ex : 034 12 345 67)." };
  const price = num(form, "price") ?? product.pricing.price;
  if (Number.isNaN(price) || price <= 0) return { error: "Prix invalide." };
  const settings = await getSettings();
  const order = await createOrder({
    product_id: product.id,
    product_name: product.name,
    product_image: product.images[0] ?? "",
    size: str(form, "size", 20),
    qty: 1,
    unit_price: Math.round(price),
    total: Math.round(price),
    deposit: depositFor(price, settings.depositPct),
    customer_name: name,
    phone,
    address: str(form, "address", 200),
    note: str(form, "note", 500),
  });
  revalidatePath("/admin", "layout");
  redirect(`/admin/commandes/${order.id}`);
}

// ---------- Settings ----------

export async function updateSettings(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = [
    "rmbRate",
    "transportPerKg",
    "defaultWeightKg",
    "marginPct",
    "fixedFees",
    "roundTo",
    "depositPct",
    "deliveryMinDays",
    "deliveryMaxDays",
  ] as const;
  const values: Partial<Settings> = {};
  for (const key of fields) {
    const n = num(form, key);
    if (n === null || Number.isNaN(n) || n < 0) return { error: `Valeur invalide : ${key}` };
    values[key] = n;
  }
  if (!values.rmbRate) return { error: "Le taux RMB doit être supérieur à 0." };
  if (values.depositPct! > 100) return { error: "L'acompte ne peut pas dépasser 100 %." };
  const whatsapp = normalizePhone(str(form, "whatsapp", 30));
  if (!/^\d{10,15}$/.test(whatsapp)) return { error: "Numéro WhatsApp invalide." };
  await saveSettings({
    ...(await getSettings()),
    ...values,
    whatsapp,
    paymentInfo: str(form, "paymentInfo", 1000),
  });
  revalidatePath("/", "layout");
  return { ok: "Paramètres enregistrés. Tous les prix sont recalculés." };
}
