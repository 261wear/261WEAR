import type { Product } from "./products";
import type { Settings } from "./settings";
import { formatAr } from "./pricing";
import { siteUrl } from "./site";

export const CATALOG_PAGE_SIZE = 48;

export function categorySlug(name: string) {
  return name.trim().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function categoryPath(name: string) {
  const slug = categorySlug(name);
  return slug ? `/chaussures/${slug}` : "/chaussures";
}

// Keep a category while its public products exist, including sold-out pairs.
// These links do not depend on the random selection shown on the home page.
export function catalogCategories(products: Pick<Product, "category">[]) {
  const groups = new Map<string, { slug: string; name: string; path: string; count: number }>();
  for (const product of products) {
    const slug = categorySlug(product.category);
    if (!slug) continue;
    const group = groups.get(slug) ?? { slug, name: product.category.trim(), path: categoryPath(product.category), count: 0 };
    group.count++;
    groups.set(slug, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export function catalogPagePath(base: string, page: number) {
  return page === 1 ? base : `${base}/page/${page}`;
}

export function pageNumber(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

export function productId(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

type PublicProduct = Pick<Product, "name" | "status" | "sizes" | "description"> & { pricing: { price: number } };

export function productSummary(product: PublicProduct, settings: Settings) {
  const availability = product.status === "epuise" ? "Épuisé" : product.status === "en_stock"
    ? `Disponible à Antananarivo, livraison en ${settings.stockDeliveryMinDays} à ${settings.stockDeliveryMaxDays} jours`
    : `Sur commande, livraison à Antananarivo en ${settings.deliveryMinDays} à ${settings.deliveryMaxDays} jours`;
  return `${product.name} : ${formatAr(product.pricing.price)}. ${availability}.`;
}

// Only recognize brands explicitly named in the public title.
export function productBrand(name: string) {
  const brands = ["New Balance", "The North Face", "Under Armour", "Golden Goose", "Nike", "Adidas", "Puma", "Asics", "Vans", "Converse", "Reebok", "Ecco", "UGG", "Prada", "Moncler", "Premiata", "Lululemon"];
  return brands.find((brand) => new RegExp(`\\b${brand.replace(/ /g, "\\s+")}\\b`, "i").test(name));
}

export function shopIdentity(settings: Settings) {
  const base = siteUrl();
  const sameAs = [settings.facebookUrl, settings.instagramUrl, settings.tiktokUrl].filter((value) => {
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  });
  const telephone = /^261\d{9}$/.test(settings.whatsapp) && settings.whatsapp !== "261340000000"
    ? `+${settings.whatsapp}` : undefined;
  return [
    {
      "@context": "https://schema.org", "@type": "OnlineStore", "@id": `${base}/#boutique`,
      name: "261° WEAR", alternateName: ["261 WEAR", "261WEAR"], url: base,
      logo: `${base}/icon.png`, telephone, sameAs,
      description: "Boutique de chaussures en ligne à Antananarivo, Madagascar. Sur commande ou disponibles de suite, commande via WhatsApp.",
      areaServed: { "@type": "City", name: "Antananarivo", alternateName: "Tana" },
      contactPoint: telephone ? { "@type": "ContactPoint", telephone, contactType: "customer service", availableLanguage: "fr" } : undefined,
    },
    {
      "@context": "https://schema.org", "@type": "WebSite", "@id": `${base}/#site`,
      name: "261° WEAR", alternateName: "261WEAR", url: base, inLanguage: "fr-MG",
      publisher: { "@id": `${base}/#boutique` },
    },
  ];
}
