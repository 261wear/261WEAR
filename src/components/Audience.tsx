"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Vercel Web Analytics, page views only (no cookie). The back-office is not
// audience, and an order link is a secret: its token never leaves the site.
function filter(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url);
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return null;
  if (url.pathname.startsWith("/commande/")) return { ...event, url: `${url.origin}/commande/[token]` };
  return event;
}

export function Audience() {
  return <Analytics beforeSend={filter} />;
}
