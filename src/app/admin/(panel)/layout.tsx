import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: "Back-office", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <Logo className="text-xl" />
          <AdminNav />
          <form action={logout} className="ml-auto">
            <SubmitButton pendingLabel="Déconnexion…" className="inline-flex items-center gap-2 py-2 text-sm text-white/60 hover:text-white">Déconnexion</SubmitButton>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
