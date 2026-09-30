import Link from "next/link";
import { listSuppliers } from "@/lib/suppliers";

export default async function SuppliersPage() {
  const suppliers = await listSuppliers();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Fournisseurs</h1>
        <div className="flex gap-2">
          <Link href="/admin/logistique" className="btn-ghost">Logistique</Link>
          <Link href="/admin/fournisseurs/nouveau" className="btn-dark">+ Ajouter un fournisseur</Link>
        </div>
      </div>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs text-muted uppercase">
            <tr>
              <th className="p-3">Fournisseur</th>
              <th className="p-3">WeChat</th>
              <th className="p-3">Délai</th>
              <th className="p-3">Produits</th>
              <th className="p-3">À commander</th>
              <th className="p-3">En transit</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-black/5 last:border-0">
                <td className="p-3">
                  <Link href={`/admin/fournisseurs/${s.id}`} className="font-semibold underline">{s.name}</Link>
                  {s.city && <span className="block text-xs text-muted">{s.city}</span>}
                </td>
                <td className="p-3 font-mono text-xs">{s.wechat || "—"}</td>
                <td className="p-3">{s.lead_days != null ? `${s.lead_days} j` : "—"}</td>
                <td className="p-3">{s.products}</td>
                <td className="p-3">
                  {s.toOrder > 0 ? (
                    <Link href="/admin/logistique" className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      {s.toOrder} paire{s.toOrder > 1 ? "s" : ""}
                    </Link>
                  ) : "—"}
                </td>
                <td className="p-3">{s.inTransit || "—"}</td>
              </tr>
            ))}
            {!suppliers.length && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted">Aucun fournisseur. Ajoute ton premier fournisseur WeChat.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
