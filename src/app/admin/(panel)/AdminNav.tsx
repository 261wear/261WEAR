"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Commandes", match: (p: string) => p === "/admin" || p.startsWith("/admin/commandes") },
  { href: "/admin/logistique", label: "Logistique" },
  { href: "/admin/produits", label: "Produits" },
  { href: "/admin/fournisseurs", label: "Fournisseurs" },
  { href: "/admin/facebook", label: "Facebook" },
  { href: "/admin/parametres", label: "Paramètres" },
  { href: "/admin/limites", label: "Limites" },
];

// One scrollable row on mobile (no stacked menu), current section highlighted.
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Back-office" className="order-last flex w-full gap-1 overflow-x-auto text-sm font-medium [scrollbar-width:none] md:order-none md:w-auto md:flex-1 [&::-webkit-scrollbar]:hidden">
      {ITEMS.map((it) => {
        const active = it.match ? it.match(pathname) : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full px-3 py-2 whitespace-nowrap transition ${active ? "bg-accent text-ink" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
          >
            {it.label}
          </Link>
        );
      })}
      <Link href="/" target="_blank" className="shrink-0 rounded-full px-3 py-2 whitespace-nowrap text-white/50 hover:text-white">
        Voir le site ↗
      </Link>
    </nav>
  );
}
