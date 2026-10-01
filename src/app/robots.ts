import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// The filters of /recherche combine into an endless number of addresses, each
// one rendered by the server: crawlers stay on the home page and the product
// pages, which are served from the cache.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/commande/", "/recherche"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
