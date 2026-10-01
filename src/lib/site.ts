// Public address of the shop. Vercel provides the production domain; SITE_URL overrides it.
export function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.SITE_URL || (host ? `https://${host}` : "http://localhost:3000")).replace(/\/$/, "");
}
