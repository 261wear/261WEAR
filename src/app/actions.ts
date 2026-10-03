"use server";

import { redirect } from "next/navigation";
import { getOrder } from "@/lib/orders";
import { normalizePhone, parseOrderNumber } from "@/lib/orders-shared";
import { rateLimit } from "@/lib/rate-limit";

export type FormState = { error?: string } | undefined;

function text(form: FormData, key: string, max = 200) {
  return String(form.get(key) ?? "").trim().slice(0, max);
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
