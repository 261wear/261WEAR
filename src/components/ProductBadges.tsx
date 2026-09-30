import { productStatus, STATUS_BADGE, type Freshness, type ProductStatus } from "@/lib/product-status";

export function FreshBadge({ fresh, className = "" }: { fresh: Freshness; className?: string }) {
  if (fresh === "nouveau") {
    return <span className={`rounded-md bg-accent px-2 py-0.5 text-[11px] font-black tracking-wider text-ink uppercase shadow-sm ${className}`}>New</span>;
  }
  if (fresh === "mis_a_jour") {
    return <span className={`rounded-md bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm ${className}`}>↻ Mis à jour</span>;
  }
  return null;
}

export function StatusBadge({ status, className = "" }: { status: ProductStatus; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${STATUS_BADGE[status]} ${className}`}>
      {status === "en_stock" && <span aria-hidden="true">⚡</span>}
      {productStatus(status).short}
    </span>
  );
}
