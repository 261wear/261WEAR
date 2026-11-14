import type { MetadataRoute } from "next";
import { shopProducts } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";
import { CATALOG_PAGE_SIZE, catalogCategories, catalogPagePath } from "@/lib/shop-seo";

export const revalidate = 86400;

// Public categories and pagination complement the product URLs. Search filters
// remain outside the sitemap and are not opened to crawlers.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await shopProducts();
  const latest = products.reduce<Date | undefined>((date, p) => !date || p.updated_at > date ? p.updated_at : date, undefined);
  const collections = [{ path: "/chaussures", count: products.length }, ...catalogCategories(products)];
  return [
    { url: base, lastModified: latest },
    { url: `${base}/contact` },
    { url: `${base}/a-propos` },
    { url: `${base}/faq` },
    { url: `${base}/guide-des-tailles` },
    { url: `${base}/cgv` },
    ...collections.flatMap((category) => Array.from({ length: Math.max(1, Math.ceil(category.count / CATALOG_PAGE_SIZE)) }, (_, i) => ({ url: `${base}${catalogPagePath(category.path, i + 1)}`, lastModified: latest }))),
    ...products.map((p) => ({ url: `${base}/produit/${p.id}`, lastModified: p.updated_at })),
  ];
}
