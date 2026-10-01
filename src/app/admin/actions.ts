"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/auth";
import { FB_MAX_PHOTOS, facebookConfigured, logPost, publishPhotoPost } from "@/lib/facebook";
import { invalidateCatalog, SHOP_TAG } from "@/lib/catalog";
import { rateLimit } from "@/lib/rate-limit";
import { createOrder, getOrder, updateOrder } from "@/lib/orders";
import { ALL_STATUS_IDS, isDbId, normalizePhone, stepsFor } from "@/lib/orders-shared";
import { depositFor } from "@/lib/pricing";
import { isValidRef, MAX_IMPORT_ROWS, normalizeRef, resolveRow, validateRow, type ImportRow } from "@/lib/import";
import { isAllowedImageUrl, MAX_IMAGES, priceIssues, productIssues } from "@/lib/product-rules";
import { isProductStatus, type ProductStatus } from "@/lib/product-status";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProductIdByRef,
  listProducts,
  setProductImages,
  setProductsStatus,
  updateProduct,
  type ProductInput,
} from "@/lib/products";
import { getSettings, saveSettings, type Settings } from "@/lib/settings";
import {
  createSupplier,
  deleteSupplier,
  findOrCreateSupplier,
  getSupplier,
  listSupplierOptions,
  updateSupplier,
  type SupplierInput,
} from "@/lib/suppliers";

export type FormState = { error?: string; ok?: string } | undefined;

// Any change visible in the shop: drop the cached snapshot (the next visit
// reads the database again) and re-render the cached pages.
function refreshShop() {
  updateTag(SHOP_TAG);
  invalidateCatalog();
  revalidatePath("/", "layout");
}

function str(form: FormData, key: string, max = 2000) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

// Ariary amounts: "210 000", "210.000" or "210 000,00" → 210000.
function numAr(form: FormData, key: string): number | null {
  const raw = str(form, key).replace(/[.,]\d{1,2}$/, "").replace(/[\s.,]/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

function num(form: FormData, key: string): number | null {
  const raw = str(form, key).replace(/\s/g, "").replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

// ---------- Session ----------

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("login", 10, 15 * 60 * 1000))) return { error: "Trop de tentatives. Réessaie dans 15 minutes." };
  if (!checkPassword(str(form, "password", 200))) {
    await new Promise((r) => setTimeout(r, 600)); // slows down password guessing
    return { error: "Mot de passe incorrect." };
  }
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
  if (id && !(await getProduct(id))) return { error: "Ce produit n'existe plus." };

  let images: unknown = [];
  try {
    images = JSON.parse(str(form, "images", 20000) || "[]");
  } catch {
    return { error: "Images invalides." };
  }
  if (!Array.isArray(images) || !images.every(isAllowedImageUrl)) return { error: "Adresse d'image invalide (https:// uniquement)." };
  if (images.length > MAX_IMAGES) return { error: `${MAX_IMAGES} photos maximum.` };

  const ref = normalizeRef(str(form, "ref", 60));
  if (ref && !isValidRef(ref)) return { error: "Référence invalide (lettres, chiffres, - _ .)." };
  if (ref) {
    const owner = await getProductIdByRef(ref);
    if (owner && owner !== id) return { error: `La référence ${ref} est déjà utilisée par un autre produit.` };
  }

  const supplierId = Number(form.get("supplier_id")) || null;
  if (supplierId && !(await getSupplier(supplierId))) return { error: "Fournisseur introuvable." };

  const status = form.get("status");
  const input: ProductInput = {
    ref: ref || null,
    supplier_id: supplierId,
    supplier_ref: str(form, "supplier_ref", 60),
    name: str(form, "name", 200),
    category: str(form, "category", 60),
    description: str(form, "description", 3000),
    price_rmb: num(form, "price_rmb"),
    cost_ar: numAr(form, "cost_ar"),
    weight_kg: num(form, "weight_kg"),
    margin_pct: num(form, "margin_pct"),
    price_override: numAr(form, "price_override"),
    sizes: [...new Set(str(form, "sizes", 400).replace(/\b(\d{2}),(5)\b/g, "$1.$2").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean))],
    images: images as string[],
    status: isProductStatus(status) ? status : "brouillon",
  };
  const issues = [...productIssues(input), ...priceIssues(input, await getSettings())];
  if (issues.length) return { error: issues.join(" · ") };

  if (id) await updateProduct(id, input);
  else await createProduct(input);
  refreshShop();
  redirect("/admin/produits");
}

// Quick status switch from the product list. Same rules as the form.
export async function setProductStatus(form: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const status = form.get("status");
  const product = await getProduct(Number(form.get("id")));
  if (!product || !isProductStatus(status)) return { error: "Produit ou statut invalide." };
  const issues = [...productIssues({ ...product, status }), ...priceIssues({ ...product, status }, await getSettings())];
  if (issues.length) return { error: issues.join(" · ") };
  await setProductsStatus([product.id], status);
  refreshShop();
  return {};
}

export type BulkResult = { updated: number; failed: { id: number; name: string; error: string }[] };

// Bulk status change from the product list: each product goes through the same
// rules as the form; the ones that fail are reported, the others are applied.
export async function bulkSetStatus(ids: number[], status: ProductStatus): Promise<BulkResult> {
  await requireAdmin();
  const result: BulkResult = { updated: 0, failed: [] };
  if (!isProductStatus(status) || !Array.isArray(ids)) return result;
  const wanted = new Set(ids.filter(isDbId).slice(0, 10_000));
  const [catalog, settings] = await Promise.all([listProducts({ onlyActive: false }), getSettings()]);
  const ok: number[] = [];
  for (const p of catalog) {
    if (!wanted.has(p.id)) continue;
    const issues = [...productIssues({ ...p, status }), ...priceIssues({ ...p, status }, settings)];
    if (issues.length) result.failed.push({ id: p.id, name: p.name, error: issues[0] });
    else ok.push(p.id);
  }
  await setProductsStatus(ok, status);
  result.updated = ok.length;
  refreshShop();
  return result;
}

export async function removeProduct(form: FormData) {
  await requireAdmin();
  await deleteProduct(Number(form.get("id")));
  refreshShop();
  redirect("/admin/produits");
}

// ---------- Bulk import ----------

export type ImportResult = {
  created: number;
  updated: number;
  suppliersCreated: string[];
  skipped: { line: number; ref: string; errors: string[] }[];
};

// Step 1: product sheets. Rows are matched on their reference: an existing
// reference is updated (empty cells keep the current value, photos are kept),
// a new one is created. Every row is re-validated here with the shared rules.
export async function importProducts(rows: ImportRow[], defaultStatus: ProductStatus): Promise<ImportResult> {
  await requireAdmin();
  const result: ImportResult = { created: 0, updated: 0, suppliersCreated: [], skipped: [] };
  if (!Array.isArray(rows) || !isProductStatus(defaultStatus)) return result;
  const seen = new Set<string>();
  const suppliers = new Map<string, number>();
  const knownSuppliers = new Set((await listSupplierOptions()).map((o) => o.name.toLowerCase()));
  // Loaded once for the whole batch (one query instead of several per row).
  const [catalog, settings] = await Promise.all([listProducts({ onlyActive: false }), getSettings()]);
  const byRef = new Map(catalog.filter((p) => p.ref).map((p) => [p.ref!, p]));
  for (const raw of rows.slice(0, MAX_IMPORT_ROWS)) {
    const row = validateRow(raw);
    const existing = byRef.get(row.ref);
    const resolved = resolveRow(row, existing, defaultStatus);
    const errors = resolved.errors.length ? [...resolved.errors] : priceIssues(resolved.product, settings);
    if (!errors.length && seen.has(row.ref)) errors.push("Référence en double");
    if (errors.length) {
      result.skipped.push({ line: row.line, ref: row.ref, errors });
      continue;
    }
    seen.add(row.ref);
    const supplierId = row.supplier ? await findOrCreateSupplier(row.supplier, suppliers) : null;
    if (row.supplier && !knownSuppliers.has(row.supplier.toLowerCase())) {
      knownSuppliers.add(row.supplier.toLowerCase());
      result.suppliersCreated.push(row.supplier);
    }
    const p = resolved.product;
    const fields = {
      ref: row.ref,
      name: p.name,
      category: p.category,
      description: p.description,
      price_rmb: p.price_rmb,
      cost_ar: p.cost_ar,
      weight_kg: p.weight_kg,
      margin_pct: p.margin_pct,
      price_override: p.price_override,
      sizes: p.sizes,
      status: p.status,
    };
    if (existing) {
      await updateProduct(existing.id, {
        ...fields,
        supplier_id: supplierId ?? existing.supplier_id,
        supplier_ref: row.supplier_ref || existing.supplier_ref,
        images: existing.images,
      });
      result.updated++;
    } else {
      await createProduct({ ...fields, supplier_id: supplierId, supplier_ref: row.supplier_ref, images: [] });
      result.created++;
    }
  }
  refreshShop();
  return result;
}

// Step 2: attach uploaded photos to a product (in the given order).
export async function attachProductImages(productId: number, urls: string[], replace: boolean) {
  await requireAdmin();
  const product = await getProduct(productId);
  if (!product || !Array.isArray(urls)) return;
  const clean = urls.filter(isAllowedImageUrl);
  const images = [...(replace ? [] : product.images), ...clean].slice(0, MAX_IMAGES);
  await setProductImages(product.id, images);
  refreshShop();
}

export async function publishProducts(ids: number[]) {
  await requireAdmin();
  // Only drafts are published; products already online keep their availability.
  // A draft goes "sur commande" if it has a RMB price, else "disponible de suite".
  for (const id of (Array.isArray(ids) ? ids : []).filter(isDbId)) {
    const p = await getProduct(id);
    if (p?.status !== "brouillon") continue;
    const status = p.price_rmb != null ? "sur_commande" : "en_stock";
    if (!productIssues({ ...p, status }).length) await setProductsStatus([p.id], status);
  }
  refreshShop();
}

// ---------- Suppliers ----------

export async function saveSupplier(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const lead = num(form, "lead_days");
  const input: SupplierInput = {
    name: str(form, "name", 80),
    wechat: str(form, "wechat", 80),
    phone: str(form, "phone", 40),
    city: str(form, "city", 60),
    payment: str(form, "payment", 120),
    lead_days: lead === null ? null : Math.round(lead),
    notes: str(form, "notes", 2000),
  };
  if (!input.name) return { error: "Le nom du fournisseur est obligatoire." };
  if (id && !(await getSupplier(id))) return { error: "Ce fournisseur n'existe plus." };
  if (lead !== null && (Number.isNaN(lead) || lead < 0 || lead > 120)) return { error: "Délai invalide (0 à 120 jours)." };
  if (id) await updateSupplier(id, input);
  else await createSupplier(input);
  revalidatePath("/admin", "layout");
  redirect("/admin/fournisseurs");
}

export async function removeSupplier(form: FormData) {
  await requireAdmin();
  await deleteSupplier(Number(form.get("id")));
  revalidatePath("/admin", "layout");
  redirect("/admin/fournisseurs");
}

// Logistics: mark a supplier's paid orders as ordered, in one go.
export async function markOrdered(form: FormData) {
  await requireAdmin();
  const ids = String(form.get("orderIds") ?? "")
    .split(",")
    .map(Number)
    .filter(isDbId);
  for (const id of ids) {
    const order = await getOrder(id);
    if (!order || order.status !== "paiement_recu" || order.in_stock) continue;
    // No note: history notes are shown to the customer, supplier names must not be.
    const history = [...order.history, { status: "commande_fournisseur", at: new Date().toISOString() }];
    await updateOrder(order.id, { status: "commande_fournisseur", history });
  }
  revalidatePath("/admin", "layout");
}

// ---------- Facebook ----------

export type PublishResult = { ok?: string; url?: string; error?: string };

export async function publishToFacebook(input: {
  productIds: number[];
  images: string[];
  message: string;
  scheduledAt: string | null; // ISO date, or null to publish now
}): Promise<PublishResult> {
  await requireAdmin();
  if (!facebookConfigured()) return { error: "Page Facebook non connectée (voir la configuration ci-dessous)." };
  const message = String(input.message ?? "").trim().slice(0, 5000);
  if (!message) return { error: "Le texte de la publication est vide." };

  // Only photos that belong to the selected products can be sent.
  const productIds = (Array.isArray(input.productIds) ? input.productIds : []).filter(isDbId).slice(0, 30);
  const allowed = new Set<string>();
  for (const id of productIds) (await getProduct(id))?.images.forEach((u) => allowed.add(u));
  const images = (Array.isArray(input.images) ? input.images : []).filter((u) => allowed.has(u));
  if (!images.length) return { error: "Sélectionne au moins une photo." };
  if (images.length > FB_MAX_PHOTOS) return { error: `${FB_MAX_PHOTOS} photos maximum par publication.` };

  let scheduledAt: Date | null = null;
  if (input.scheduledAt) {
    scheduledAt = new Date(input.scheduledAt);
    const min = Date.now() + 10 * 60 * 1000;
    const max = Date.now() + 30 * 86400 * 1000;
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < min || scheduledAt.getTime() > max) {
      return { error: "La programmation doit être entre 10 minutes et 30 jours à l'avance (règle Facebook)." };
    }
  }

  try {
    const postId = await publishPhotoPost(images, message, scheduledAt);
    await logPost({ fbPostId: postId, message, productIds, photoCount: images.length, scheduledAt, status: scheduledAt ? "programme" : "publie", error: "" });
    revalidatePath("/admin/facebook");
    return {
      ok: scheduledAt
        ? `Publication programmée le ${scheduledAt.toLocaleString("fr-FR", { timeZone: "Indian/Antananarivo", dateStyle: "long", timeStyle: "short" })}.`
        : "Publié sur Facebook ✓",
      url: `https://www.facebook.com/${postId}`,
    };
  } catch (err) {
    const error = (err as Error).message;
    await logPost({ fbPostId: null, message, productIds, photoCount: images.length, scheduledAt, status: "erreur", error });
    revalidatePath("/admin/facebook");
    return { error };
  }
}

// ---------- Orders ----------

export async function setOrderStatus(form: FormData) {
  await requireAdmin();
  const order = await getOrder(Number(form.get("id")));
  const status = str(form, "status", 40);
  if (!order || !ALL_STATUS_IDS.includes(status)) return;
  // A "disponible de suite" order never goes through the China steps.
  const allowed = [...stepsFor(order.in_stock).map((s) => s.id), "annule"] as string[];
  if (!allowed.includes(status) || status === order.status) return;
  const note = str(form, "note", 200);
  const history = [...order.history, { status, at: new Date().toISOString(), ...(note ? { note } : {}) }];
  await updateOrder(order.id, { status, history });
  revalidatePath("/admin", "layout");
}

export async function saveOrderDetails(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const order = await getOrder(Number(form.get("id")));
  if (!order) return { error: "Commande introuvable." };
  const paid = numAr(form, "amount_paid");
  if (paid === null || Number.isNaN(paid) || paid < 0) return { error: "Montant payé invalide." };
  if (paid > order.total) return { error: `Le montant reçu dépasse le total de la commande (${order.total.toLocaleString("fr-FR")} Ar).` };
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
  if (!order || !isAllowedImageUrl(url) || order.proofs.length >= 20) return;
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
  const price = numAr(form, "price") ?? product.pricing.price;
  if (Number.isNaN(price) || price < 1000 || price > 1_000_000_000) return { error: "Prix invalide." };
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
    in_stock: product.status === "en_stock",
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
    "stockDeliveryMinDays",
    "stockDeliveryMaxDays",
    "badgeDays",
  ] as const;
  const values: Partial<Settings> = {};
  for (const key of fields) {
    const n = num(form, key);
    if (n === null || Number.isNaN(n) || n < 0) return { error: `Valeur invalide : ${key}` };
    values[key] = n;
  }
  if (!values.rmbRate) return { error: "Le taux RMB doit être supérieur à 0." };
  const bounds: [keyof Settings, number, string][] = [
    ["rmbRate", 10_000, "Taux RMB"],
    ["transportPerKg", 5_000_000, "Transport par kg"],
    ["fixedFees", 5_000_000, "Frais fixes"],
    ["roundTo", 1_000_000, "Arrondi"],
    ["deliveryMaxDays", 365, "Délai maximum"],
    ["stockDeliveryMaxDays", 365, "Délai maximum (stock)"],
    ["badgeDays", 365, "Durée des badges"],
  ];
  for (const [k, max, label] of bounds) {
    if ((values[k] as number) > max) return { error: `${label} trop élevé (${max.toLocaleString("fr-FR")} max) : faute de frappe ?` };
  }
  if (!(values.depositPct! >= 1 && values.depositPct! <= 100)) return { error: "L'acompte doit être entre 1 et 100 %." };
  if (values.marginPct! > 500) return { error: "Marge par défaut trop élevée (500 % max)." };
  if (!(values.defaultWeightKg! >= 0.1 && values.defaultWeightKg! <= 20)) return { error: "Poids par défaut invalide (0,1 à 20 kg)." };
  if (values.deliveryMinDays! > values.deliveryMaxDays!) return { error: "Sur commande : le délai minimum dépasse le maximum." };
  if (values.stockDeliveryMinDays! > values.stockDeliveryMaxDays!) return { error: "Disponible de suite : le délai minimum dépasse le maximum." };
  for (const k of ["deliveryMinDays", "deliveryMaxDays", "stockDeliveryMinDays", "stockDeliveryMaxDays", "badgeDays", "roundTo", "fixedFees", "transportPerKg"] as const) {
    values[k] = Math.round(values[k]!);
  }
  const urls: Partial<Settings> = {};
  for (const key of ["facebookUrl", "instagramUrl", "tiktokUrl"] as const) {
    const v = str(form, key, 300);
    if (v && !/^https:\/\/[^\s]+$/.test(v)) return { error: `Lien invalide pour ${key.replace("Url", "")} (doit commencer par https://).` };
    urls[key] = v;
  }
  const whatsapp = normalizePhone(str(form, "whatsapp", 30));
  if (!/^\d{10,15}$/.test(whatsapp)) return { error: "Numéro WhatsApp invalide." };
  await saveSettings({
    ...(await getSettings()),
    ...values,
    ...urls,
    whatsapp,
    paymentInfo: str(form, "paymentInfo", 1000),
  });
  refreshShop();
  return { ok: "Paramètres enregistrés. Tous les prix sont recalculés." };
}
