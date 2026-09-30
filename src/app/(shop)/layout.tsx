import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { waLink } from "@/lib/orders-shared";
import { getSettings } from "@/lib/settings";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  const wa = waLink(settings.whatsapp, "Bonjour 261 WEAR ! J'ai une question :");
  return (
    <>
      <div className="bg-accent px-4 py-2 text-center text-xs font-semibold tracking-wide text-ink uppercase">
        Sur commande · Livraison à Tana en {settings.deliveryMinDays} à {settings.deliveryMaxDays} jours
      </div>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Logo />
          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link href="/#drop" className="hover:text-accent">Drop</Link>
            <Link href="/suivi" className="hover:text-accent">Suivi</Link>
            <Link href="/guide-des-tailles" className="hidden hover:text-accent sm:block">Tailles</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-ink text-white/70">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
          <div>
            <Logo className="text-white" />
            <p className="mt-3 text-sm">Représente le 261. Chaussures premium sur commande, livrées à Tana.</p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/suivi" className="hover:text-white">Suivre ma commande</Link>
            <Link href="/guide-des-tailles" className="hover:text-white">Guide des tailles</Link>
            <Link href="/cgv" className="hover:text-white">Conditions générales de vente</Link>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <a href={wa} target="_blank" rel="noopener" className="hover:text-white">WhatsApp</a>
            <a href="https://www.instagram.com/261wear" target="_blank" rel="noopener" className="hover:text-white">Instagram @261wear</a>
            <a href="https://www.facebook.com/261wear" target="_blank" rel="noopener" className="hover:text-white">Facebook 261 WEAR</a>
          </div>
        </div>
        <p className="border-t border-white/10 py-5 text-center text-xs">© {new Date().getFullYear()} 261 WEAR · Antananarivo, Madagascar</p>
      </footer>
      <FloatingWhatsApp href={wa} />
    </>
  );
}
