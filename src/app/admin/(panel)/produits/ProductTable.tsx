"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { bulkSetStatus, type BulkResult } from "@/app/admin/actions";
import { Highlight } from "@/components/Highlight";
import { FreshBadge } from "@/components/ProductBadges";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Img } from "@/components/ui/Img";
import { thumbUrl } from "@/lib/images";
import { formatAr } from "@/lib/pricing";
import { PRODUCT_STATUSES, type Freshness, type ProductStatus } from "@/lib/product-status";
import { StatusSelect } from "./StatusSelect";

export type Row = {
  id: number;
  name: string;
  meta: string;
  image: string | null;
  photos: number;
  basis: string;
  cost: number;
  price: number;
  profit: number;
  overridden: boolean;
  status: ProductStatus;
  fresh: Freshness;
  issues: string[];
};

export function ProductTable({ rows, allIds, query, emptyText }: { rows: Row[]; allIds: number[]; query: string; emptyText: string }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<ProductStatus>("sur_commande");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BulkResult | null>(null);

  const pageIds = rows.map((r) => r.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const togglePage = () =>
    setSelected((s) => {
      const n = new Set(s);
      if (allOnPage) pageIds.forEach((id) => n.delete(id));
      else pageIds.forEach((id) => n.add(id));
      return n;
    });

  function apply() {
    setResult(null);
    const ids = [...selected];
    startTransition(async () => {
      const res = await bulkSetStatus(ids, status);
      setResult(res);
      if (!res.failed.length) setSelected(new Set());
      else setSelected(new Set(res.failed.map((f) => f.id)));
    });
  }

  const withPhotos = rows.filter((r) => selected.has(r.id) && r.photos > 0).map((r) => r.id);

  return (
    <>
      {selected.size > 0 && (
        <div className="sticky top-[env(safe-area-inset-top,0px)] z-20 mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-ink p-3 text-sm text-white shadow-lg" role="region" aria-label="Actions groupées">
          <b className="px-1">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</b>
          {selected.size < allIds.length && (
            <button type="button" onClick={() => setSelected(new Set(allIds))} className="underline">
              Sélectionner les {allIds.length} résultats
            </button>
          )}
          <button type="button" onClick={() => setSelected(new Set())} className="text-white/70 underline">Tout désélectionner</button>
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <label htmlFor="bulk-status" className="text-white/70">Passer en</label>
            <select id="bulk-status" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)} className="rounded-full bg-white px-3 py-2 text-ink">
              {PRODUCT_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <Button type="button" onClick={apply} pending={pending} pendingLabel="Mise à jour…" className="btn-accent py-2">
              Appliquer
            </Button>
            {withPhotos.length > 0 && (
              <Link href={`/admin/facebook?produits=${withPhotos.join(",")}`} className="btn border border-white/30 py-2 text-white hover:border-white">
                Publier sur Facebook
              </Link>
            )}
          </span>
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-2">
          {result.updated > 0 && <FormMessage ok={`${result.updated} produit${result.updated > 1 ? "s" : ""} mis à jour.`} />}
          {result.failed.length > 0 && (
            <FormMessage
              error={`${result.failed.length} non modifié${result.failed.length > 1 ? "s" : ""} (restent sélectionnés) : ${result.failed
                .slice(0, 5)
                .map((f) => `${f.name} (${f.error})`)
                .join(" · ")}${result.failed.length > 5 ? "…" : ""}`}
            />
          )}
        </div>
      )}

      <div className="card mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs text-muted uppercase">
            <tr>
              <th className="w-10 p-3">
                <input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Sélectionner les produits de cette page" className="h-4 w-4" />
              </th>
              <th className="p-3">Produit</th>
              <th className="p-3">Base de prix</th>
              <th className="p-3">Coût</th>
              <th className="p-3">Prix de vente</th>
              <th className="p-3">Marge</th>
              <th className="p-3">Statut</th>
              <th className="p-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan={8} className="p-10 text-center text-muted">{emptyText}</td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className={`border-b border-black/5 last:border-0 ${selected.has(p.id) ? "bg-accent/15" : "hover:bg-paper"}`}>
                <td className="p-3">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Sélectionner ${p.name}`} className="h-4 w-4" />
                </td>
                <td className="p-3">
                  <Link href={`/admin/produits/${p.id}`} className="flex items-center gap-3">
                    {p.image ? (
                      <Img src={thumbUrl(p.image)} fallback={p.image} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="h-12 w-12 shrink-0 rounded-lg bg-paper" />
                    )}
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold underline"><Highlight text={p.name} query={query} /></span>
                        <FreshBadge fresh={p.fresh} className="!text-[10px]" />
                      </span>
                      <span className="block text-xs text-muted">
                        {p.meta}
                        {!p.photos && <span className="ml-1 font-semibold text-amber-700">· sans photo</span>}
                      </span>
                      {p.issues.length > 0 && <span className="block text-xs font-semibold text-red-700">⚠ à compléter : {p.issues.join(" · ")}</span>}
                    </span>
                  </Link>
                </td>
                <td className="p-3 text-xs whitespace-nowrap">{p.basis}</td>
                <td className="p-3 whitespace-nowrap">{formatAr(p.cost)}</td>
                <td className="p-3 font-semibold whitespace-nowrap">
                  {formatAr(p.price)}
                  {p.overridden && <span className="ml-1 text-xs text-amber-700">(forcé)</span>}
                </td>
                <td className={`p-3 whitespace-nowrap ${p.profit > 0 ? "text-green-700" : "text-red-700"}`}>{formatAr(p.profit)}</td>
                <td className="p-3"><StatusSelect id={p.id} status={p.status} name={p.name} /></td>
                <td className="p-3">
                  {p.photos > 0 && (
                    <Link href={`/admin/facebook?produits=${p.id}`} className="text-xs font-semibold whitespace-nowrap text-[#1877F2] hover:underline">
                      Facebook →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per product instead of a wide table. */}
      <div className="mt-4 md:hidden">
        <label className="mb-2 flex items-center gap-2 px-1 text-sm text-muted">
          <input type="checkbox" checked={allOnPage} onChange={togglePage} className="h-5 w-5" />
          Sélectionner la page
        </label>
        {!rows.length && <p className="card p-8 text-center text-muted">{emptyText}</p>}
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.id} className={`card flex gap-3 p-3 ${selected.has(p.id) ? "border-ink bg-accent/15" : ""}`}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Sélectionner ${p.name}`} className="mt-1 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <Link href={`/admin/produits/${p.id}`} className="flex gap-3">
                  {p.image ? (
                    <Img src={thumbUrl(p.image)} fallback={p.image} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-paper text-[10px] font-semibold text-amber-700">Sans photo</span>
                  )}
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold"><Highlight text={p.name} query={query} /></span>
                      <FreshBadge fresh={p.fresh} className="!text-[10px]" />
                    </span>
                    <span className="block truncate text-xs text-muted">{p.meta}</span>
                    <span className="mt-1 block text-sm">
                      <b>{formatAr(p.price)}</b>
                      <span className={`ml-2 text-xs ${p.profit > 0 ? "text-green-700" : "text-red-700"}`}>marge {formatAr(p.profit)}</span>
                    </span>
                    <span className="block text-xs text-muted">{p.basis}</span>
                  </span>
                </Link>
                {p.issues.length > 0 && <p className="mt-1 text-xs font-semibold text-red-700">⚠ à compléter : {p.issues.join(" · ")}</p>}
                <div className="mt-2 flex items-center gap-3">
                  <StatusSelect id={p.id} status={p.status} name={p.name} />
                  {p.photos > 0 && (
                    <Link href={`/admin/facebook?produits=${p.id}`} className="py-2 text-xs font-semibold text-[#1877F2]">Facebook →</Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
