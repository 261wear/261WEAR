import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Back-office", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="min-h-full">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Logo className="text-xl" />
          <nav className="flex flex-1 flex-wrap gap-4 text-sm font-medium">
            <Link href="/admin" className="hover:text-accent">Commandes</Link>
            <Link href="/admin/logistique" className="hover:text-accent">Logistique</Link>
            <Link href="/admin/produits" className="hover:text-accent">Produits</Link>
            <Link href="/admin/fournisseurs" className="hover:text-accent">Fournisseurs</Link>
            <Link href="/admin/facebook" className="hover:text-accent">Facebook</Link>
            <Link href="/admin/parametres" className="hover:text-accent">Paramètres</Link>
            <Link href="/" target="_blank" className="text-white/60 hover:text-accent">Voir le site ↗</Link>
          </nav>
          <form action={logout}>
            <SubmitButton pendingLabel="Déconnexion…" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">Déconnexion</SubmitButton>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
