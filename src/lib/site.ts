import type { Metadata } from "next";

// A missing hosting variable must never publish localhost or a preview domain
// as the canonical address of the production shop.
export function siteUrl() {
  const fallback = process.env.NODE_ENV === "production" ? "https://261wear.com" : "http://localhost:3000";
  try {
    const url = new URL(process.env.SITE_URL?.trim() || fallback);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return fallback;
    if (process.env.NODE_ENV === "production" && /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url.hostname)) return fallback;
    if (["261wear.com", "www.261wear.com"].includes(url.hostname)) {
      url.hostname = "261wear.com";
      url.protocol = "https:";
      url.port = "";
    }
    return url.origin;
  } catch {
    return fallback;
  }
}

// Running on a hosting platform (not on a developer's machine).
export const hosted = Boolean(process.env.VERCEL || process.env.NETLIFY);

// Shared Open Graph fields. A page that sets its own openGraph replaces the
// layout's object entirely (Next.js merges metadata key by key), so pages
// spread this to keep the site name and locale in link previews.
export const OPEN_GRAPH = { type: "website", locale: "fr_MG", siteName: "261° WEAR" } as const;

// A page's Open Graph object replaces the parent: retain its preview image.
export function pageUrls(path: string): Metadata {
  return { alternates: { canonical: path }, openGraph: { ...OPEN_GRAPH, url: path, images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }] } };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
