// Product availability + freshness badges (safe for client and server).

export const PRODUCT_STATUSES = [
  { id: "sur_commande", label: "Sur commande", short: "Sur commande", isPublic: true, orderable: true },
  { id: "en_stock", label: "Disponible de suite", short: "Dispo de suite", isPublic: true, orderable: true },
  { id: "epuise", label: "Épuisé", short: "Épuisé", isPublic: true, orderable: false },
  { id: "brouillon", label: "Brouillon (non publié)", short: "Brouillon", isPublic: false, orderable: false },
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number]["id"];

export const PRODUCT_STATUS_IDS = PRODUCT_STATUSES.map((s) => s.id) as ProductStatus[];

export function productStatus(id: string) {
  return PRODUCT_STATUSES.find((s) => s.id === id) ?? PRODUCT_STATUSES[3];
}

export function isProductStatus(id: unknown): id is ProductStatus {
  return typeof id === "string" && (PRODUCT_STATUS_IDS as string[]).includes(id);
}

// Tailwind classes per status, used in the shop and the back-office.
export const STATUS_BADGE: Record<ProductStatus, string> = {
  sur_commande: "bg-white text-ink ring-1 ring-black/15",
  en_stock: "bg-emerald-600 text-white",
  epuise: "bg-black/70 text-white",
  brouillon: "bg-black/5 text-black/60 ring-1 ring-dashed ring-black/20",
};

export type Freshness = "nouveau" | "mis_a_jour" | null;

const DAY = 86400000;

// "Nouveau" = published recently; "Mis à jour" = changed recently after publication.
export function freshness(p: { published_at: Date | null; updated_at: Date }, days: number, now = Date.now()): Freshness {
  if (!p.published_at || days <= 0) return null;
  const published = p.published_at.getTime();
  if (now - published < days * DAY) return "nouveau";
  const updated = p.updated_at.getTime();
  if (now - updated < days * DAY && updated - published > DAY) return "mis_a_jour";
  return null;
}
