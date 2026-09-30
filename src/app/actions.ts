"use server";

import { redirect } from "next/navigation";
import { createOrder, getOrder } from "@/lib/orders";
import { normalizePhone, parseOrderNumber } from "@/lib/orders-shared";
import { depositFor } from "@/lib/pricing";
import { getProduct } from "@/lib/products";
import { getSettings } from "@/lib/settings";

export type FormState = { error?: string } | undefined;

function text(form: FormData, key: string, max = 200) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

export async function placeOrder(_prev: FormState, form: FormData): Promise<FormState> {
  const product = await getProduct(Number(form.get("productId")));
  if (!product || !product.active) return { error: "Ce modèle n'est plus disponible." };
  if (product.status === "epuise") return { error: "Ce modèle vient d'être épuisé." };

  const size = text(form, "size", 20);
  const name = text(form, "name", 80);
  const phone = normalizePhone(text(form, "phone", 30));
  const address = text(form, "address", 200);
  const note = text(form, "note", 500);

  if (product.sizes.length && !product.sizes.includes(size)) return { error: "Choisissez votre pointure." };
  if (name.length < 2) return { error: "Indiquez votre nom." };
  if (!/^2613\d{8}$/.test(phone)) return { error: "Numéro invalide (ex : 034 12 345 67)." };
  if (address.length < 3) return { error: "Indiquez votre quartier / adresse de livraison." };

  const settings = await getSettings();
  const price = product.pricing.price;
  const order = await createOrder({
    product_id: product.id,
    product_name: product.name,
    product_image: product.images[0] ?? "",
    size,
    qty: 1,
    unit_price: price,
    total: price,
    deposit: depositFor(price, settings.depositPct),
    customer_name: name,
    phone,
    address,
    note,
    in_stock: product.status === "en_stock",
  });
  redirect(`/commande/${order.token}?nouvelle=1`);
}

export async function trackOrder(_prev: FormState, form: FormData): Promise<FormState> {
  const id = parseOrderNumber(text(form, "number", 30));
  const phone = normalizePhone(text(form, "phone", 30));
  const order = id ? await getOrder(id) : null;
  if (!order || order.phone !== phone) {
    return { error: "Aucune commande trouvée avec ce numéro et ce téléphone." };
  }
  redirect(`/commande/${order.token}`);
}
