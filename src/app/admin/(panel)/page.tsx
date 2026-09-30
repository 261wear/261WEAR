import Link from "next/link";
import { countByStatus, listOrders } from "@/lib/orders";
import { ALL_STATUS_IDS, displayPhone, normalizePhone, orderNumber, parseOrderNumber, statusLabel } from "@/lib/orders-shared";
import { Highlight } from "@/components/Highlight";
import { scoreFields, tokenize } from "@/lib/search";
import { LinkPending } from "@/components/ui/LinkPending";
import { formatAr } from "@/lib/pricing";
import { StatusBadge } from "./StatusBadge";

export default async function OrdersPage(props: PageProps<"/admin">) {
  const { statut, q: rawQ } = await props.searchParams;
  const filter = typeof statut === "string" && ALL_STATUS_IDS.includes(statut) ? statut : undefined;
  const q = typeof rawQ === "string" ? rawQ.slice(0, 80) : "";
  const [allOrders, counts] = await Promise.all([listOrders(filter), countByStatus()]);

  // Search by order number, phone (any format), customer or product name.
  const byNumber = parseOrderNumber(q);
  const digits = q.replace(/\D/g, "");
  const tokens = tokenize(q);
  const orders = q
    ? allOrders.filter(
        (o) =>
          (byNumber !== null && o.id === byNumber) ||
          (digits.length >= 6 && o.phone.includes(normalizePhone(digits).slice(-9))) ||
          scoreFields(tokens, [{ text: o.customer_name, weight: 3 }, { text: o.product_name, weight: 2 }, { text: o.address, weight: 1 }]) > 0,
      )
    : allOrders;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const tab = (id: string | undefined, label: string, n: number) => (
    <Link
      key={id ?? "all"}
      href={id ? `/admin?statut=${id}${q ? `&q=${encodeURIComponent(q)}` : ""}` : `/admin${q ? `?q=${encodeURIComponent(q)}` : ""}`}
      className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
        filter === id ? "bg-ink text-white" : "bg-white hover:bg-black/5"
      }`}
    >
      {label} <span className="opacity-60">{n}</span> <LinkPending />
    </Link>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Commandes</h1>
        <Link href="/admin/commandes/nouvelle" className="btn-dark">+ Commande manuelle</Link>
      </div>
      <form action="/admin" role="search" className="mt-5 flex gap-2">
        {filter && <input type="hidden" name="statut" value={filter} />}
        <input name="q" type="search" defaultValue={q} placeholder="N° de commande, téléphone, client, modèle…" aria-label="Rechercher une commande" className="input max-w-lg" />
        <button className="btn-dark">Rechercher</button>
        {q && <Link href={filter ? `/admin?statut=${filter}` : "/admin"} className="btn-ghost">Effacer</Link>}
      </form>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
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
                  <Highlight text={o.customer_name} query={q} />
                  <div className="text-xs text-muted">{displayPhone(o.phone)}</div>
                </td>
                <td className="p-3">
                  <Highlight text={o.product_name} query={q} />
                  {o.size && <span className="text-muted"> · {o.size}</span>}
                  {o.in_stock && <span className="ml-1 text-xs font-semibold text-emerald-700">⚡ stock</span>}
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
                <td colSpan={7} className="p-10 text-center text-muted">{q ? `Aucune commande pour « ${q} ».` : "Aucune commande."}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
