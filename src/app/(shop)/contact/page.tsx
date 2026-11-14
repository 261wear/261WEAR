import type { Metadata } from "next";
import Link from "next/link";
import { shopSettings } from "@/lib/catalog";
import { displayPhone, waLink } from "@/lib/orders-shared";
import { pageUrls } from "@/lib/site";
import { SocialLinks } from "@/components/SocialLinks";

export const metadata: Metadata = {
  ...pageUrls("/contact"), title: "Contact — boutique de chaussures à Antananarivo",
  description: "Contacte 261° WEAR sur WhatsApp pour choisir une paire, confirmer ta pointure ou poser une question sur la livraison à Tana, Madagascar.",
};

export default async function Contact() {
  const settings = await shopSettings();
  const wa = waLink(settings.whatsapp, "Bonjour 261 WEAR ! J’ai une question sur une paire :");
  const configuredPhone = /^261\d{9}$/.test(settings.whatsapp) && settings.whatsapp !== "261340000000";
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Contacte 261° WEAR à Antananarivo</h1>
      <p className="mt-5 text-lg text-ink/75">Une question sur un modèle, une pointure ou ta livraison à Tana ? Écris-nous sur WhatsApp avec le lien de la paire qui t’intéresse.</p>
      {configuredPhone && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-dark mt-6">WhatsApp · {displayPhone(settings.whatsapp)}</a>}
      <section className="card mt-8 p-6">
        <h2 className="font-display text-2xl">Une boutique en ligne à Tana</h2>
        <p className="mt-3 text-ink/75">261° WEAR propose des chaussures sur commande ou disponibles de suite, livrées à Antananarivo, Madagascar. Avant de commander, confirme avec nous le modèle, la pointure et les modalités de livraison.</p>
        <p className="mt-3 text-ink/75">Sur commande : {settings.deliveryMinDays} à {settings.deliveryMaxDays} jours après confirmation de l’acompte. Paires déjà en stock à Tana : {settings.stockDeliveryMinDays} à {settings.stockDeliveryMaxDays} jours. Les délais sont indicatifs.</p>
      </section>
      <section className="mt-8">
        <h2 className="font-display mb-4 text-2xl">Nos réseaux officiels</h2>
        <div className="rounded-3xl bg-ink p-5 text-white"><SocialLinks facebookUrl={settings.facebookUrl} instagramUrl={settings.instagramUrl} tiktokUrl={settings.tiktokUrl} whatsappHref={configuredPhone ? wa : ""} /></div>
      </section>
      <p className="mt-8 text-sm text-muted">Pour une commande en cours, utilise <Link href="/suivi" className="underline">le suivi de commande</Link>. Consulte aussi <Link href="/faq" className="underline">les questions fréquentes</Link> et <Link href="/cgv" className="underline">les conditions de vente</Link>.</p>
    </div>
  );
}
