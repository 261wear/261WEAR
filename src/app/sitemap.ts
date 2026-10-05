import type { MetadataRoute } from "next";
import { shopProducts } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

export const revalidate = 86400;

// /recherche is closed to crawlers (see robots.ts): this is how they find the products.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await shopProducts();
  return [
    { url: base },
    { url: `${base}/guide-des-tailles` },
    { url: `${base}/cgv` },
    ...products.map((p) => ({ url: `${base}/produit/${p.id}`, lastModified: p.updated_at })),
  ];
}
