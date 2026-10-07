import Link from "next/link";
import { Suspense } from "react";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { Logo } from "@/components/Logo";
import { SearchBox } from "@/components/SearchBox";
import { SocialLinks } from "@/components/SocialLinks";
import { popularCategories, shopSettings } from "@/lib/catalog";
import { waLink } from "@/lib/orders-shared";

// Shop pages without visitor-specific data are served from the cache: rebuilt
// after a back-office change, and once a day (date-based badges count in days).
export const revalidate = 86400;

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const [settings, popular] = await Promise.all([shopSettings(), popularCategories()]);
  const wa = waLink(settings.whatsapp, "Bonjour 261 WEAR ! J'ai une question :");
  return (
    <>
      <div className="bg-accent px-4 py-2 text-center text-xs font-semibold tracking-wide text-ink uppercase">
        Sur commande en {settings.deliveryMinDays}–{settings.deliveryMaxDays} j · Disponible de suite en {settings.stockDeliveryMinDays}–{settings.stockDeliveryMaxDays} j à Tana
      </div>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <Logo />
          <div className="order-last w-full md:order-none md:w-auto md:flex-1">
            <Suspense fallback={<div className="h-11 rounded-full bg-white" aria-hidden="true" />}>
              <SearchBox popular={popular} />
            </Suspense>
          </div>
          <nav aria-label="Principal" className="ml-auto flex items-center gap-1 text-sm font-medium md:ml-0">
            <Link href="/recherche" className="rounded-full px-3 py-2 hover:text-accent">Catalogue</Link>
            <Link href="/suivi" className="rounded-full px-3 py-2 hover:text-accent">Suivi</Link>
            <Link href="/guide-des-tailles" className="hidden rounded-full px-3 py-2 hover:text-accent lg:block">Tailles</Link>
          </nav>
        </div>
      </header>
      {/* min-h-svh keeps the footer below the fold while a page streams in (no layout shift). */}
      <main className="min-h-svh flex-1">{children}</main>
      <footer className="bg-ink text-white/70">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo className="text-white" />
            <p className="mt-3 text-sm">Représente le 261. Chaussures premium sur commande ou disponibles de suite, livrées à Tana.</p>
          </div>
          <nav aria-label="Boutique" className="flex flex-col text-sm [&_a]:py-1.5">
            <p className="mb-1 text-xs font-semibold tracking-wide text-white uppercase">Boutique</p>
            <Link href="/recherche?tri=nouveautes" className="hover:text-white">Nouveautés</Link>
            <Link href="/recherche?dispo=en_stock" className="hover:text-white">Disponible de suite</Link>
            <Link href="/recherche" className="hover:text-white">Tout le catalogue</Link>
          </nav>
          <nav aria-label="Aide" className="flex flex-col text-sm [&_a]:py-1.5">
            <p className="mb-1 text-xs font-semibold tracking-wide text-white uppercase">Aide</p>
            <Link href="/suivi" className="hover:text-white">Suivre ma commande</Link>
            <Link href="/guide-des-tailles" className="hover:text-white">Guide des tailles</Link>
            <Link href="/cgv" className="hover:text-white">Conditions générales de vente</Link>
          </nav>
          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-white uppercase">Suis-nous</p>
            <SocialLinks
              facebookUrl={settings.facebookUrl}
              instagramUrl={settings.instagramUrl}
              tiktokUrl={settings.tiktokUrl}
              whatsappHref={wa}
            />
            <p className="mt-3 text-sm">Drops, nouveautés et retours en stock en avant-première.</p>
            <p className="font-display mt-5 inline-block -rotate-3 rounded-lg bg-accent px-3 py-1.5 text-xl leading-none text-ink">#261Family</p>
          </div>
        </div>
        <p className="border-t border-white/10 py-5 text-center text-xs">© {new Date().getFullYear()} 261° WEAR · Antananarivo, Madagascar</p>
      </footer>
      <FloatingWhatsApp href={wa} />
    </>
  );
}
