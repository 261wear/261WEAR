// Public address of the shop. Vercel (VERCEL_PROJECT_PRODUCTION_URL) and
// Netlify (URL) provide the production domain; SITE_URL overrides both.
export function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.SITE_URL || (host ? `https://${host}` : process.env.URL) || "http://localhost:3000").replace(/\/$/, "");
}

// Running on a hosting platform (not on a developer's machine).
export const hosted = Boolean(process.env.VERCEL || process.env.NETLIFY);
