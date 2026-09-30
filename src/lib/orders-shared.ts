// Order statuses and message helpers (safe for client and server).

export const STATUSES = [
  { id: "en_attente_paiement", label: "En attente de paiement", step: "Commande reçue" },
  { id: "paiement_recu", label: "Acompte reçu", step: "Paiement confirmé" },
  { id: "commande_fournisseur", label: "Commandé chez le fournisseur", step: "Commandée en Chine" },
  { id: "expedie", label: "Expédié depuis la Chine", step: "En route vers Madagascar" },
  { id: "arrive_tana", label: "Arrivé à Tana", step: "Arrivée à Tana" },
  { id: "en_livraison", label: "En cours de livraison", step: "En livraison" },
  { id: "livre", label: "Livré", step: "Livrée" },
] as const;

export const CANCELLED = { id: "annule", label: "Annulé" } as const;

// "Disponible de suite" orders are already in Tana: no China steps.
const CHINA_STEPS = ["commande_fournisseur", "expedie", "arrive_tana"];

export function stepsFor(inStock: boolean) {
  return inStock ? STATUSES.filter((s) => !CHINA_STEPS.includes(s.id)) : [...STATUSES];
}

export type StatusId = (typeof STATUSES)[number]["id"] | typeof CANCELLED.id;

export const ALL_STATUS_IDS: string[] = [...STATUSES.map((s) => s.id), CANCELLED.id];

export function statusLabel(id: string) {
  if (id === CANCELLED.id) return CANCELLED.label;
  return STATUSES.find((s) => s.id === id)?.label ?? id;
}

export function statusIndex(id: string) {
  return STATUSES.findIndex((s) => s.id === id);
}

export function orderNumber(id: number) {
  return `261-${String(id).padStart(4, "0")}`;
}

export function parseOrderNumber(input: string): number | null {
  const m = input.trim().match(/^(?:261\s*-?\s*)?0*(\d{1,9})$/);
  return m ? Number(m[1]) : null;
}

// Normalise a Malagasy phone number to 2613XXXXXXXX (digits only).
export function normalizePhone(input: string) {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "261" + d.slice(1);
  if (!d.startsWith("261") && d.length === 9) d = "261" + d;
  return d;
}

export function displayPhone(p: string) {
  const d = p.startsWith("261") ? "0" + p.slice(3) : p;
  return d.replace(/^(\d{3})(\d{2})(\d{3})(\d{2})$/, "$1 $2 $3 $4");
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
