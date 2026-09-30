import { statusLabel } from "@/lib/orders-shared";

const COLORS: Record<string, string> = {
  en_attente_paiement: "bg-amber-100 text-amber-800",
  paiement_recu: "bg-sky-100 text-sky-800",
  commande_fournisseur: "bg-indigo-100 text-indigo-800",
  expedie: "bg-violet-100 text-violet-800",
  arrive_tana: "bg-teal-100 text-teal-800",
  en_livraison: "bg-lime-200 text-lime-900",
  livre: "bg-green-100 text-green-800",
  annule: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${COLORS[status] ?? "bg-black/5"}`}>
      {statusLabel(status)}
    </span>
  );
}
