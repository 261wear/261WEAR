import { statusLabel } from "@/lib/orders-shared";

// Noir, craie et citron seulement : de plus en plus foncé à mesure que la commande avance.
const COLORS: Record<string, string> = {
  en_attente_paiement: "bg-white text-ink ring-1 ring-ink/15",
  paiement_recu: "bg-ink/10 text-ink",
  commande_fournisseur: "bg-ink/20 text-ink",
  expedie: "bg-ink/70 text-white",
  arrive_tana: "bg-accent text-ink",
  en_livraison: "bg-accent text-ink ring-2 ring-ink/15",
  livre: "bg-ink text-white",
  annule: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${COLORS[status] ?? "bg-black/5 text-ink"}`}>
      {statusLabel(status)}
    </span>
  );
}
