"use server";

import { redirect } from "next/navigation";
import { createOrder, getOrder } from "@/lib/orders";
import { normalizePhone, parseOrderNumber } from "@/lib/orders-shared";
import { depositFor } from "@/lib/pricing";
import { getProduct } from "@/lib/products";
import { rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";

export type FormState = { error?: string; refresh?: boolean } | undefined;

function text(form: FormData, key: string, max = 200) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

export async function placeOrder(_prev: FormState, form: FormData): Promise<FormState> {
  // Honeypot: a field hidden from people; bots fill it in.
  if (text(form, "website")) return { error: "Commande refusée." };
  const product = await getProduct(Number(form.get("productId")));
  if (!product || !product.active) return { error: "Ce modèle n'est plus disponible.", refresh: true };
  if (product.status === "epuise") return { error: "Ce modèle vient d'être épuisé.", refresh: true };

  const size = text(form, "size", 20);
  const name = text(form, "name", 80);
  const phone = normalizePhone(text(form, "phone", 30));
  const address = text(form, "address", 200);
  const note = text(form, "note", 500);

  if (product.sizes.length && !size) return { error: "Choisissez votre pointure." };
  if (product.sizes.length && !product.sizes.includes(size)) {
    return { error: `La pointure ${size} n'est plus disponible pour ce modèle.`, refresh: true };
  }
  if (name.length < 2) return { error: "Indiquez votre nom." };
  if (!/^2613\d{8}$/.test(phone)) return { error: "Numéro invalide (ex : 034 12 345 67)." };
  if (address.length < 3) return { error: "Indiquez votre quartier / adresse de livraison." };

  const settings = await getSettings();
  const price = product.pricing.price;
  if (!(price > 0 && price <= 1_000_000_000)) return { error: "Ce modèle n'est pas disponible à la commande pour le moment." };
  // The customer must order at the price they saw (it can change with the exchange rate).
  const expected = Number(form.get("expectedPrice"));
  if (expected !== price) {
    return { error: `Le prix de ce modèle vient d'être mis à jour : ${price.toLocaleString("fr-FR")} Ar. Vérifie puis valide à nouveau.`, refresh: true };
  }
  // Counted only for orders actually created, so typing mistakes never block anyone.
  if (!(await rateLimit("order", 8, 60 * 60 * 1000))) {
    return { error: "Trop de commandes depuis cette connexion. Réessaie plus tard ou écris-nous sur WhatsApp." };
  }
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
  if (!(await rateLimit("track", 20, 10 * 60 * 1000))) return { error: "Trop de tentatives. Réessaie dans quelques minutes." };
  const id = parseOrderNumber(text(form, "number", 30));
  const phone = normalizePhone(text(form, "phone", 30));
  const order = id ? await getOrder(id) : null;
  if (!order || order.phone !== phone) {
    return { error: "Aucune commande trouvée avec ce numéro et ce téléphone." };
  }
  redirect(`/commande/${order.token}`);
}
