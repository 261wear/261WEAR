import { thumbUrl } from "@/lib/images";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Timeline } from "@/components/Timeline";
import { Img } from "@/components/ui/Img";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { getOrderByToken, paidAt } from "@/lib/orders";
import { orderNumber, waLink } from "@/lib/orders-shared";
import { formatAr } from "@/lib/pricing";
import { shopSettings } from "@/lib/catalog";

export const metadata: Metadata = { title: "Ma commande", robots: { index: false } };

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400000).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Indian/Antananarivo",
  });
}

export default async function OrderPage(props: PageProps<"/commande/[token]">) {
  const [{ token }, search] = await Promise.all([props.params, props.searchParams]);
  const [order, settings] = await Promise.all([getOrderByToken(token), shopSettings()]);
  if (!order) notFound();

  const number = orderNumber(order.id);
  const isNew = search.nouvelle === "1";
  const awaitingPayment = order.status === "en_attente_paiement";
  const remaining = Math.max(order.total - order.amount_paid, 0);
  const paid = paidAt(order);
  const delivered = order.status === "livre";
  const [dMin, dMax] = order.in_stock
    ? [settings.stockDeliveryMinDays, settings.stockDeliveryMaxDays]
    : [settings.deliveryMinDays, settings.deliveryMaxDays];
  const deliveredAt = [...order.history].reverse().find((h) => h.status === "livre")?.at;

  const message = [
    `Bonjour 261 WEAR ! 👟`,
    `Commande N° ${number}`,
    `Modèle : ${order.product_name}${order.size ? ` — Pointure ${order.size}` : ""}${order.in_stock ? " (dispo de suite)" : ""}`,
    `Prix : ${formatAr(order.total)} — Acompte : ${formatAr(order.deposit)}`,
    `Nom : ${order.customer_name}`,
    `Livraison : ${order.address}`,
    ``,
    awaitingPayment ? `Je vous envoie la capture de mon paiement ci-dessous.` : `J'ai une question sur ma commande.`,
  ].join("\n");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {isNew && (
        <div className="mb-6 rounded-2xl bg-accent p-5">
          <p className="font-display text-2xl">Commande enregistrée ✓</p>
          <p className="mt-1 text-sm">Dernière étape : paie l&apos;acompte puis envoie ta commande et la capture sur WhatsApp.</p>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display flex items-center gap-3 text-4xl">
          Commande {number}
          {/* "Polaroïd" stamp from the brand moodboard. */}
          {delivered && <span className="inline-block rotate-3 bg-ink px-3 py-1 text-2xl text-white">Livrée</span>}
        </h1>
        <p className="text-sm text-muted">{delivered ? "Partage ta photo avec #261Family !" : "Garde ce lien pour suivre ton colis."}</p>
      </div>

      <div className="card mt-6 flex gap-4 p-4">
        {order.product_image && (
          <Img src={thumbUrl(order.product_image)} fallback={order.product_image} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
        )}
        <div className="min-w-0 flex-1 text-sm">
          <p className="text-base font-semibold">{order.product_name}</p>
          {order.size && <p>Pointure {order.size}</p>}
          <p className="mt-2">Total : <b className="whitespace-nowrap">{formatAr(order.total)}</b></p>
          <p>Déjà payé : <b className="whitespace-nowrap">{formatAr(order.amount_paid)}</b> · Reste : <b className="whitespace-nowrap">{formatAr(remaining)}</b></p>
        </div>
      </div>

      {awaitingPayment && (
        <div className="card mt-6 p-5">
          <h2 className="font-semibold">1. Paie l&apos;acompte de {formatAr(order.deposit)}</h2>
          <p className="mt-2 rounded-lg bg-paper p-3 text-sm font-medium whitespace-pre-line">{settings.paymentInfo}</p>
          <p className="mt-2 text-xs text-muted">Référence à indiquer : {number}</p>
          <h2 className="mt-5 font-semibold">2. Envoie la commande et la capture sur WhatsApp</h2>
          <a
            href={waLink(settings.whatsapp, message)}
            target="_blank"
            rel="noopener"
            className="btn mt-3 w-full bg-[#25D366] py-4 text-base text-white hover:brightness-95"
          >
            <WhatsAppIcon /> Envoyer sur WhatsApp
          </a>
        </div>
      )}

      <div className="card mt-6 p-5">
        <h2 className="font-semibold">Suivi du colis</h2>
        <p className="mt-1 text-sm text-black/60">
          {delivered && deliveredAt
            ? `Livrée le ${new Date(deliveredAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Indian/Antananarivo" })}. Merci pour ta confiance !`
            : paid
            ? `Livraison estimée entre le ${addDays(paid, dMin)} et le ${addDays(paid, dMax)}.`
            : `${order.in_stock ? "⚡ Disponible de suite : l" : "L"}ivraison en ${dMin} à ${dMax} jours après confirmation du paiement.`}
        </p>
        {order.tracking_ref && <p className="mt-1 text-sm">Référence colis : <b>{order.tracking_ref}</b></p>}
        <div className="mt-5">
          <Timeline status={order.status} history={order.history} inStock={order.in_stock} />
        </div>
      </div>

      {delivered && (
        <div className="card mt-6 p-5 text-center">
          <p className="font-display text-2xl">Bienvenue dans la #261Family 🙌</p>
          <p className="mt-1 text-sm text-black/60">Ton avis compte : envoie-nous une photo de toi avec ta paire.</p>
          <a
            href={waLink(
              settings.whatsapp,
              `Bonjour 261 WEAR ! J'ai bien reçu ma commande N° ${number} (${order.product_name}).\n\nMon avis : \n\n(Je joins une photo de moi avec ma paire 📸)`,
            )}
            target="_blank"
            rel="noopener"
            className="btn-accent mt-4 w-full"
          >
            <WhatsAppIcon /> Donner mon avis + photo
          </a>
        </div>
      )}

      {!awaitingPayment && (
        <a href={waLink(settings.whatsapp, message)} target="_blank" rel="noopener" className="btn-ghost mt-6 w-full">
          <WhatsAppIcon /> Une question ? Écris-nous
        </a>
      )}
    </div>
  );
}
