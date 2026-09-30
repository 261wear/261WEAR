import "server-only";
import { headers } from "next/headers";

// Simple fixed-window limiter kept in memory. On serverless it is per instance,
// which is enough to slow down scripts hammering a form; not a hard guarantee.
const hits = new Map<string, { count: number; reset: number }>();

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
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
