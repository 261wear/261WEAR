import { statusLabel } from "@/lib/orders-shared";

// Une teinte de la palette Chroma par étape ; le texte reste en encre pour garder le contraste.
const COLORS: Record<string, string> = {
  en_attente_paiement: "bg-peach text-ink",
  paiement_recu: "bg-sky text-ink",
  commande_fournisseur: "bg-lilac text-ink",
  expedie: "bg-pink text-ink",
  arrive_tana: "bg-pistachio text-ink",
  en_livraison: "bg-pistachio text-ink ring-2 ring-ink/15",
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
