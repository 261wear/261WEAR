"use client";

import { usePathname } from "next/navigation";
import { WhatsAppIcon } from "./WhatsAppIcon";

// Hidden on pages that already have their own WhatsApp call-to-action.
export function FloatingWhatsApp({ href }: { href: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/produit/") || pathname.startsWith("/commande/")) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="Nous écrire sur WhatsApp"
      className="fixed right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
