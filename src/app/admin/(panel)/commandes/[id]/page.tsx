import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Timeline } from "@/components/Timeline";
import { SubmitButton } from "@/components/ui/Button";
import { Img } from "@/components/ui/Img";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { setOrderStatus } from "@/app/admin/actions";
import { getOrder } from "@/lib/orders";
import { getProduct } from "@/lib/products";
import { getSupplier } from "@/lib/suppliers";
import { CANCELLED, displayPhone, orderNumber, stepsFor, waLink } from "@/lib/orders-shared";
import { formatAr } from "@/lib/pricing";
import { StatusBadge } from "../../StatusBadge";
import { OrderEditor } from "./OrderEditor";

const CUSTOMER_MESSAGES: Record<string, string> = {
  en_attente_paiement: "nous avons bien reçu votre commande. Merci d'envoyer la capture de l'acompte pour la lancer.",
  paiement_recu: "votre acompte est bien reçu ✅ Nous lançons votre commande.",
  commande_fournisseur: "votre paire est commandée chez notre fournisseur 👟",
  expedie: "votre paire a quitté la Chine et est en route vers Madagascar ✈️",
  arrive_tana: "votre paire est arrivée à Tana 🇲🇬 Nous vous contactons pour la livraison.",
  en_livraison: "votre paire est en cours de livraison 🛵 Merci de garder votre téléphone à proximité.",
  livre: "votre paire est livrée. Merci pour votre confiance ! Envoyez-nous une photo pour la #261Family 🙌",
  annule: "votre commande a été annulée.",
};

export default async function AdminOrderPage(props: PageProps<"/admin/commandes/[id]">) {
  const order = await getOrder(Number((await props.params).id));
  if (!order) notFound();

  const product = order.product_id ? await getProduct(order.product_id) : null;
  const supplier = product?.supplier_id ? await getSupplier(product.supplier_id) : null;

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const trackUrl = `${origin}/commande/${order.token}`;
  const number = orderNumber(order.id);
  const firstName = order.customer_name.split(" ")[0];
  const remaining = Math.max(order.total - order.amount_paid, 0);
  const steps = stepsFor(order.in_stock);
  const currentIdx = steps.findIndex((s) => s.id === order.status);
  const next = currentIdx >= 0 ? steps[currentIdx + 1] : undefined;

  const notify = waLink(
    order.phone,
    `Bonjour ${firstName} ! Commande 261 WEAR N° ${number} : ${CUSTOMER_MESSAGES[order.status] ?? ""}\n\nSuivi : ${trackUrl}`,
  );

  return (
    <>
      <Link href="/admin" className="text-sm text-muted hover:text-ink">← Commandes</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl">{number}</h1>
        <StatusBadge status={order.status} />
        {order.in_stock && <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white">⚡ Stock Tana</span>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="card flex gap-4 p-5">
            {order.product_image && (
              <Img src={order.product_image} alt="" className="h-28 w-28 rounded-xl object-cover" />
            )}
            <div className="text-sm">
              <p className="text-base font-semibold">
                {order.product_id ? <Link href={`/admin/produits/${order.product_id}`} className="underline">{order.product_name}</Link> : order.product_name}
              </p>
              {order.size && <p>Pointure <b>{order.size}</b></p>}
              <p className="mt-1 text-xs text-muted">
                Fournisseur :{" "}
                {supplier ? (
                  <>
                    <Link href={`/admin/fournisseurs/${supplier.id}`} className="underline">{supplier.name}</Link>
                    {supplier.wechat && ` · WeChat ${supplier.wechat}`}
                    {product?.supplier_ref && ` · réf. ${product.supplier_ref}`}
                  </>
                ) : (
                  "non renseigné"
                )}
              </p>
              <p className="mt-2">Total {formatAr(order.total)} · Acompte {formatAr(order.deposit)}</p>
              <p>
                Payé <b className={order.amount_paid >= order.deposit ? "text-green-700" : "text-red-700"}>{formatAr(order.amount_paid)}</b>
                {" · "}Reste à encaisser <b>{formatAr(remaining)}</b>
              </p>
            </div>
          </div>

          <div className="card grid gap-4 p-5 text-sm sm:grid-cols-2">
            <div>
              <p className="label">Client</p>
              <p className="font-semibold">{order.customer_name}</p>
              <p>{displayPhone(order.phone)}</p>
              <p className="mt-1 text-black/70">{order.address}</p>
              {order.note && <p className="mt-2 rounded bg-paper p-2 text-black/70">« {order.note} »</p>}
            </div>
            <div className="flex flex-col gap-2">
              <a href={notify} target="_blank" rel="noopener" className="btn bg-[#25D366] text-white hover:brightness-95">
                <WhatsAppIcon /> Prévenir le client
              </a>
              <a href={waLink(order.phone, `Bonjour ${firstName} !`)} target="_blank" rel="noopener" className="btn-ghost">
                Ouvrir la discussion
              </a>
              <a href={trackUrl} target="_blank" className="btn-ghost">Page de suivi client ↗</a>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold">Changer le statut</h2>
            {next && (
              <form action={setOrderStatus} className="mt-3">
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="status" value={next.id} />
                <SubmitButton pendingLabel="Mise à jour…" className="btn-accent w-full">Passer à : {next.label} →</SubmitButton>
              </form>
            )}
            <form action={setOrderStatus} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="id" value={order.id} />
              <select key={order.status} name="status" defaultValue={order.status} className="input w-auto flex-1">
                {steps.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
                <option value={CANCELLED.id}>{CANCELLED.label}</option>
              </select>
              <input name="note" placeholder="Note visible par le client (facultatif)" className="input flex-[2]" />
              <SubmitButton pendingLabel="Mise à jour…">Appliquer</SubmitButton>
            </form>
            <p className="mt-2 text-xs text-muted">Après chaque changement, clique sur « Prévenir le client » pour lui envoyer la mise à jour.</p>
            <div className="mt-6">
              <Timeline status={order.status} history={order.history} inStock={order.in_stock} />
            </div>
          </div>
        </div>

        <OrderEditor
          id={order.id}
          amountPaid={order.amount_paid}
          deposit={order.deposit}
          total={order.total}
          trackingRef={order.tracking_ref}
          adminNote={order.admin_note}
          proofs={order.proofs}
        />
      </div>
    </>
  );
}
