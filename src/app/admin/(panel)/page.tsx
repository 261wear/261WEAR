import Link from "next/link";
import { countByStatus, listOrders } from "@/lib/orders";
import { ALL_STATUS_IDS, displayPhone, orderNumber, statusLabel } from "@/lib/orders-shared";
import { formatAr } from "@/lib/pricing";
import { StatusBadge } from "./StatusBadge";

export default async function OrdersPage(props: PageProps<"/admin">) {
  const { statut } = await props.searchParams;
  const filter = typeof statut === "string" && ALL_STATUS_IDS.includes(statut) ? statut : undefined;
  const [orders, counts] = await Promise.all([listOrders(filter), countByStatus()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const tab = (id: string | undefined, label: string, n: number) => (
    <Link
      key={id ?? "all"}
      href={id ? `/admin?statut=${id}` : "/admin"}
      className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
        filter === id ? "bg-ink text-white" : "bg-white hover:bg-black/5"
      }`}
    >
      {label} <span className="opacity-60">{n}</span>
    </Link>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Commandes</h1>
        <Link href="/admin/commandes/nouvelle" className="btn-dark">+ Commande manuelle</Link>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {tab(undefined, "Toutes", total)}
        {ALL_STATUS_IDS.map((id) => tab(id, statusLabel(id), counts[id] ?? 0))}
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs text-muted uppercase">
            <tr>
              <th className="p-3">N°</th>
              <th className="p-3">Client</th>
              <th className="p-3">Produit</th>
              <th className="p-3">Total</th>
              <th className="p-3">Payé</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-black/5 last:border-0 hover:bg-paper">
                <td className="p-3 font-semibold">
                  <Link href={`/admin/commandes/${o.id}`} className="underline">{orderNumber(o.id)}</Link>
                </td>
                <td className="p-3">
                  {o.customer_name}
                  <div className="text-xs text-muted">{displayPhone(o.phone)}</div>
                </td>
                <td className="p-3">
                  {o.product_name}
                  {o.size && <span className="text-muted"> · {o.size}</span>}
                </td>
                <td className="p-3">{formatAr(o.total)}</td>
                <td className={`p-3 ${o.amount_paid >= o.deposit ? "text-green-700" : "text-red-700"}`}>
                  {formatAr(o.amount_paid)}
                </td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
                <td className="p-3 text-muted">{o.created_at.toLocaleDateString("fr-FR", { timeZone: "Indian/Antananarivo" })}</td>
              </tr>
            ))}
            {!orders.length && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted">Aucune commande.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
