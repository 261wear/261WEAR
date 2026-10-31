// Social media studio: frames, formats and captions (safe for client and server).
// Frames come from the moodboard (../Moodboard/4 cadres signature…): one frame
// = one kind of post, so a 261° WEAR photo is recognised in the feed before
// anyone reads it.

import { formatAr } from "./pricing";
import type { ProductStatus } from "./product-status";

export const FRAMES = [
  { id: "ticket", label: "Ticket", use: "Nouveau modèle, sur commande" },
  { id: "neon", label: "Néon", use: "Paire déjà à Tana" },
  { id: "pellicule", label: "Pellicule", use: "Drop, story, titre au choix" },
  { id: "polaroid", label: "Polaroïd", use: "Client livré, avis" },
] as const;

export type FrameId = (typeof FRAMES)[number]["id"];
export type FrameChoice = FrameId | "auto";

export function isFrame(v: unknown): v is FrameId {
  return FRAMES.some((f) => f.id === v);
}

// "Auto": the frame the moodboard gives to the product's status.
export function frameFor(choice: FrameChoice, status: ProductStatus): FrameId {
  if (choice !== "auto") return choice;
  return status === "en_stock" ? "neon" : "ticket";
}

// 4:5 is the portrait size every network shows in full in the feed (Instagram,
// Facebook) and the safe default for boosted posts. 9:16 fills the screen on
// TikTok (photo mode), stories and Reels covers.
export const FORMATS = [
  { id: "4x5", label: "Post 4:5", networks: "Instagram · Facebook", width: 1080, height: 1350 },
  { id: "9x16", label: "Vertical 9:16", networks: "TikTok · Stories", width: 1080, height: 1920 },
] as const;

export type FormatId = (typeof FORMATS)[number]["id"];

export function isFormat(v: unknown): v is FormatId {
  return FORMATS.some((f) => f.id === v);
}

export function formatSize(id: FormatId) {
  return FORMATS.find((f) => f.id === id)!;
}

export type PhotoFit = "cover" | "contain";

export const TITLE_MAX = 40;

// Default big title of the Pellicule and Polaroïd frames.
export function defaultTitle(frame: FrameId) {
  return frame === "polaroid" ? "CLIENT LIVRÉ" : "NOUVEAU DROP";
}

// ---------- Text shared by the visuals and the captions ----------

export function sizeRange(sizes: string[]) {
  const nums = sizes.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (nums.length === sizes.length && nums.length > 2) return `${nums[0]} à ${nums[nums.length - 1]}`;
  return sizes.join(" · ");
}

export type Delivery = { order: string; stock: string }; // "7 à 14 jours", "1 à 2 jours"

export function deliveryLine(status: ProductStatus, d: Delivery) {
  return status === "en_stock" ? `Déjà à Tana · livrée en ${d.stock}` : `Sur commande · livrée à Tana en ${d.order}`;
}

// Short address, easy to type from a photo or a caption: /p/123 redirects to
// the product page.
export function shortLink(origin: string, id: number) {
  return `${origin.replace(/^https?:\/\//, "").replace(/^www\./, "")}/p/${id}`;
}

// ---------- Captions ----------

export type CaptionProduct = {
  id: number;
  ref: string | null;
  name: string;
  status: ProductStatus;
  price: number;
  sizes: string[];
};

export const NETWORKS = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
] as const;

export type NetworkId = (typeof NETWORKS)[number]["id"];

const BRANDS: [RegExp, string][] = [
  [/jordan/i, "#jordan"],
  [/yeezy/i, "#yeezy"],
  [/nike|air force|air max|dunk/i, "#nike"],
  [/adidas|samba|gazelle|campus/i, "#adidas"],
  [/new ?balance|\bnb ?\d/i, "#newbalance"],
  [/asics|kayano|gel/i, "#asics"],
  [/puma/i, "#puma"],
  [/converse/i, "#converse"],
  [/vans/i, "#vans"],
  [/salomon/i, "#salomon"],
  [/onitsuka/i, "#onitsukatiger"],
];

function brandTags(products: CaptionProduct[]) {
  const tags = new Set<string>();
  for (const p of products) for (const [re, tag] of BRANDS) if (re.test(p.name)) { tags.add(tag); break; }
  return [...tags];
}

// 3 to 5 hashtags: the networks now read them as keywords, a wall of tags looks like spam.
function hashtags(products: CaptionProduct[], network: NetworkId) {
  const base = network === "facebook" ? ["#261wear", "#sneakers", "#tana"] : ["#261wear", "#sneakers", "#madagascar", "#tana"];
  return [...base, ...brandTags(products)].slice(0, network === "facebook" ? 3 : 5).join(" ");
}

function refOf(p: CaptionProduct) {
  return p.ref || `#${p.id}`;
}

function sizesOf(p: CaptionProduct) {
  return p.sizes.length ? sizeRange(p.sizes) : "";
}

// The first line is all most people see before « … plus » : model + price.
export function buildCaption(network: NetworkId, products: CaptionProduct[], origin: string, d: Delivery): string {
  if (!products.length) return "";
  const allStock = products.every((p) => p.status === "en_stock");
  const delivery = allStock ? `Déjà à Tana, livrée en ${d.stock}` : `Livrée à Tana en ${d.order}, photo de contrôle qualité avant l'envoi`;
  const tags = hashtags(products, network);

  if (products.length === 1) {
    const p = products[0];
    const sizes = sizesOf(p);
    const head = `${p.name.toUpperCase()} · ${formatAr(p.price)}`;
    if (network === "facebook") {
      return [
        head,
        p.status === "en_stock" ? "⚡ Dispo de suite" : "Sur commande",
        ...(sizes ? [`Pointures : ${sizes}`] : []),
        delivery,
        "",
        `Commander : ${origin}/produit/${p.id}`,
        "Ou écris-nous en message / WhatsApp.",
        "",
        tags,
      ].join("\n");
    }
    if (network === "tiktok") {
      return [
        `${p.name} à ${formatAr(p.price)} à Tana${p.status === "en_stock" ? ", dispo de suite ⚡" : ""}`,
        `${sizes ? `Pointures ${sizes} · ` : ""}lien en bio · réf. ${refOf(p)}`,
        tags,
      ].join("\n");
    }
    return [
      head,
      p.status === "en_stock" ? "⚡ Dispo de suite à Tana" : "Sur commande",
      ...(sizes ? [`Pointures : ${sizes}`] : []),
      delivery,
      "",
      `Pour commander : lien en bio, ou écris-nous en message avec la réf. ${refOf(p)}`,
      `Lien direct : ${shortLink(origin, p.id)}`,
      "",
      tags,
    ].join("\n");
  }

  // Carousel: one line per pair, numbered in the order of the photos.
  const lines = products.map((p, i) => {
    const stock = p.status === "en_stock" && !allStock ? " ⚡ dispo de suite" : "";
    const link = network === "facebook" ? `${origin}/produit/${p.id}` : shortLink(origin, p.id);
    return network === "tiktok"
      ? `${i + 1}. ${p.name} · ${formatAr(p.price)}${stock}`
      : `${i + 1}. ${p.name} · ${formatAr(p.price)}${stock}\n   ${link}`;
  });
  if (network === "tiktok") {
    return [`${products.length} paires dispo à Tana, laquelle tu prends ? 👇`, ...lines, "Lien en bio pour commander", tags].join("\n");
  }
  return [
    allStock ? "⚡ DISPO DE SUITE À TANA" : "NOUVEAU DROP 261° WEAR",
    "",
    ...lines,
    "",
    delivery,
    network === "facebook" ? "Commande sur le site ou en message / WhatsApp." : "Pour commander : lien en bio ou écris-nous en message.",
    "",
    tags,
  ].join("\n");
}

// Short reminders shown next to each caption (sources in the studio page).
export const NETWORK_TIPS: Record<NetworkId, string[]> = {
  instagram: [
    "Les liens ne sont pas cliquables dans la légende : « lien en bio » + lien court à taper.",
    "Carrousel jusqu'à 20 photos, toutes au même format (4:5). La 1re photo fait l'accroche.",
    "Repartage en story avec le sticker « Lien » vers la fiche : c'est le seul lien cliquable.",
  ],
  tiktok: [
    "Publier en mode photo (carrousel) en 9:16, ajouter un son tendance dans l'appli.",
    "Lien non cliquable : « lien en bio ». Le lien dans la bio demande un compte Entreprise.",
    "Les mots de la légende servent à la recherche TikTok : nom du modèle + Tana + prix.",
  ],
  facebook: [
    "Le lien est cliquable : il mène directement à la fiche de la paire.",
    "Publier depuis la Page 261° WEAR, en 4:5 ; jusqu'à 10 photos par publication.",
    "Partager ensuite le lien du post dans les groupes de Tana (pas les fichiers).",
  ],
};
