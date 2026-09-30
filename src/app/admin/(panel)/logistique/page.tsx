import { thumbUrl } from "@/lib/images";
import Link from "next/link";
import { markOrdered } from "@/app/admin/actions";
import { SubmitButton } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Img } from "@/components/ui/Img";
import { orderNumber, statusLabel } from "@/lib/orders-shared";
import { getSettings } from "@/lib/settings";
import { inTransitBySupplier, toOrderBySupplier, type LogisticsLine, type SupplierBucket } from "@/lib/suppliers";
import { StatusBadge } from "../StatusBadge";

type Item = { key: string; line: LogisticsLine; qty: number; orders: number[] };

// Same product + size ordered by several customers = one line for the supplier.
function aggregate(lines: LogisticsLine[]): Item[] {
  const map = new Map<string, Item>();
  for (const l of lines) {
    const key = `${l.productId ?? l.productName}|${l.size}`;
    const item = map.get(key) ?? { key, line: l, qty: 0, orders: [] };
    item.qty += l.qty;
    item.orders.push(l.orderId);
    map.set(key, item);
  }
  return [...map.values()];
}

function daysSince(d: Date) {
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function wechatText(bucket: SupplierBucket, items: Item[]) {
  const date = new Date().toLocaleDateString("fr-FR", { timeZone: "Indian/Antananarivo" });
  const lines = items.map((it, i) => {
    const ref = it.line.supplierRef || it.line.ref || "";
    const price = it.line.priceRmb != null ? ` — ¥${it.line.priceRmb}` : "";
    return `${i + 1}. ${ref ? `[${ref}] ` : ""}${it.line.productName} — Size/尺码 ${it.line.size || "?"} × ${it.qty}${price}`;
  });
  const pairs = items.reduce((n, it) => n + it.qty, 0);
  const total = items.reduce((n, it) => n + (it.line.priceRmb ?? 0) * it.qty, 0);
  return [
    `Hello${bucket.supplier ? ` ${bucket.supplier.name}` : ""}! New order from 261 WEAR (${date}):`,
    ...lines,
    ``,
    `Total: ${pairs} pairs / 双 — ¥${total.toLocaleString("en-US")}`,
    `Please send quality control photos before shipping. 发货前请发质检照片，谢谢！`,
  ].join("\n");
}

export default async function LogisticsPage() {
  const [toOrder, inTransit, settings] = await Promise.all([toOrderBySupplier(), inTransitBySupplier(), getSettings()]);
  const pendingPairs = toOrder.reduce((n, b) => n + b.lines.reduce((m, l) => m + l.qty, 0), 0);

  return (
    <>
      <h1 className="font-display text-3xl">Logistique</h1>
      <p className="mt-1 text-sm text-muted">Commandes payées à passer chez les fournisseurs, puis suivi jusqu&apos;à l&apos;arrivée à Tana.</p>

      <h2 className="mt-8 flex items-center gap-2 text-lg font-semibold">
        À commander <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm text-amber-800">{pendingPairs} paire{pendingPairs > 1 ? "s" : ""}</span>
      </h2>
      {!toOrder.length && <p className="card mt-3 p-6 text-sm text-muted">Rien à commander : toutes les commandes payées sont déjà passées.</p>}
      <div className="mt-3 space-y-4">
        {toOrder.map((bucket) => {
          const items = aggregate(bucket.lines);
          const totalRmb = items.reduce((n, it) => n + (it.line.priceRmb ?? 0) * it.qty, 0);
          const weight = items.reduce((n, it) => n + (it.line.weightKg ?? settings.defaultWeightKg) * it.qty, 0);
          const orderIds = bucket.lines.map((l) => l.orderId);
          return (
            <section key={bucket.supplier?.id ?? "none"} className="card overflow-hidden">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 p-4">
                <div>
                  {bucket.supplier ? (
                    <Link href={`/admin/fournisseurs/${bucket.supplier.id}`} className="font-semibold underline">{bucket.supplier.name}</Link>
                  ) : (
                    <p className="font-semibold text-red-700">Sans fournisseur — à relier dans la fiche produit</p>
                  )}
                  {bucket.supplier && (
                    <p className="text-xs text-muted">
                      {[bucket.supplier.wechat && `WeChat ${bucket.supplier.wechat}`, bucket.supplier.payment, bucket.supplier.city].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <p className="text-right text-sm">
                  <b>¥{totalRmb.toLocaleString("fr-FR")}</b>
                  <span className="block text-xs text-muted">≈ {weight.toFixed(1).replace(".", ",")} kg · transport ≈ {Math.round(weight * settings.transportPerKg).toLocaleString("fr-FR")} Ar</span>
                </p>
              </header>
              <table className="w-full text-left text-sm">
                <tbody>
                  {items.map((it) => (
                    <tr key={it.key} className="border-b border-black/5 last:border-0">
                      <td className="w-14 p-3">
                        {it.line.productImage ? <Img src={thumbUrl(it.line.productImage)} fallback={it.line.productImage} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="block h-10 w-10 rounded-md bg-paper" />}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold">{it.line.productName}</span>
                        <span className="block text-xs text-muted">
                          {[it.line.ref, it.line.supplierRef && `réf. fourn. ${it.line.supplierRef}`].filter(Boolean).join(" · ")}
                        </span>
                      </td>
                      <td className="p-3">Pointure <b>{it.line.size || "—"}</b></td>
                      <td className="p-3">× <b>{it.qty}</b></td>
                      <td className="p-3 text-right text-xs text-muted">
                        {it.orders.map((id) => (
                          <Link key={id} href={`/admin/commandes/${id}`} className="ml-1 underline">{orderNumber(id)}</Link>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-black/10 bg-paper/60 p-3">
                <CopyButton text={wechatText(bucket, items)} label="Copier la commande pour WeChat" />
                <form action={markOrdered}>
                  <input type="hidden" name="orderIds" value={orderIds.join(",")} />
                  <SubmitButton pendingLabel="Mise à jour…" className="btn-dark">
                    Marquer {orderIds.length} commande{orderIds.length > 1 ? "s" : ""} comme commandée{orderIds.length > 1 ? "s" : ""}
                  </SubmitButton>
                </form>
              </footer>
            </section>
          );
        })}
      </div>

      <h2 className="mt-10 text-lg font-semibold">En cours d&apos;acheminement</h2>
      {!inTransit.length && <p className="card mt-3 p-6 text-sm text-muted">Aucun colis en route.</p>}
      <div className="mt-3 space-y-4">
        {inTransit.map((bucket) => (
          <section key={bucket.supplier?.id ?? "none"} className="card overflow-x-auto">
            <header className="border-b border-black/10 p-4 font-semibold">
              {bucket.supplier?.name ?? "Sans fournisseur"}
              {bucket.supplier?.lead_days != null && <span className="ml-2 text-xs font-normal text-muted">délai habituel {bucket.supplier.lead_days} j</span>}
            </header>
            <table className="w-full min-w-[640px] text-left text-sm">
              <tbody>
                {bucket.lines.map((l) => {
                  const days = daysSince(l.since);
                  const late = l.status === "commande_fournisseur" && bucket.supplier?.lead_days != null && days > bucket.supplier.lead_days;
                  return (
                    <tr key={l.orderId} className="border-b border-black/5 last:border-0">
                      <td className="p-3"><Link href={`/admin/commandes/${l.orderId}`} className="font-semibold underline">{orderNumber(l.orderId)}</Link></td>
                      <td className="p-3">{l.productName} <span className="text-muted">· {l.size}</span></td>
                      <td className="p-3">{l.customerName}</td>
                      <td className="p-3"><StatusBadge status={l.status} /></td>
                      <td className={`p-3 text-right text-xs ${late ? "font-semibold text-red-700" : "text-muted"}`}>
                        {statusLabel(l.status).split(" ")[0]} depuis {days} j{late ? " · en retard" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </>
  );
}
