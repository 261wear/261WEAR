// Public address of the shop. Vercel (VERCEL_PROJECT_PRODUCTION_URL) and
// Netlify (URL) provide the production domain; SITE_URL overrides both.
export function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.SITE_URL || (host ? `https://${host}` : process.env.URL) || "http://localhost:3000").replace(/\/$/, "");
}

// Running on a hosting platform (not on a developer's machine).
export const hosted = Boolean(process.env.VERCEL || process.env.NETLIFY);

// Shared Open Graph fields. A page that sets its own openGraph replaces the
// layout's object entirely (Next.js merges metadata key by key), so pages
// spread this to keep the site name and locale in link previews.
export const OPEN_GRAPH = { type: "website", locale: "fr_FR", siteName: "261° WEAR" } as const;

// Canonical address of a public page (relative to metadataBase). Only the
// canonical: an openGraph object here would replace the layout's one and drop
// the share image (app/opengraph-image.png).
export function pageUrls(path: string) {
  return { alternates: { canonical: path } };
}
