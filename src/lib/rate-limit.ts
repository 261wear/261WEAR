import "server-only";
import { headers } from "next/headers";

// Simple fixed-window limiter kept in memory. On serverless it is per instance,
// which is enough to slow down scripts hammering a form; not a hard guarantee.
const hits = new Map<string, { count: number; reset: number }>();

// Visitor address as seen by the hosting platform. The first X-Forwarded-For
// entry is written by the client itself and can be forged to dodge the limit,
// so the platform's own headers come first: Netlify, then Vercel. The last
// X-Forwarded-For entry (added by the closest proxy) is the fallback.
export async function clientIp() {
  const h = await headers();
  const forwarded = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return (
    h.get("x-nf-client-connection-ip") ||
    h.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    forwarded[forwarded.length - 1] ||
    "local"
  );
}

export async function rateLimit(scope: string, limit: number, windowMs: number) {
  const key = `${scope}:${await clientIp()}`;
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}
