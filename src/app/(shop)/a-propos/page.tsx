import type { Metadata } from "next";
import Link from "next/link";
import { shopSettings } from "@/lib/catalog";
import { pageUrls } from "@/lib/site";

export const metadata: Metadata = {
  ...pageUrls("/a-propos"), title: "La boutique de chaussures à Tana",
  description: "Découvre 261° WEAR, boutique de chaussures en ligne à Antananarivo : modèles sur commande ou en stock, paiement Mobile Money et livraison à Tana.",
};

export default async function About() {
  const settings = await shopSettings();
  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 py-12">
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">261° WEAR, ta boutique de chaussures en ligne à Tana</h1>
      <p className="text-lg text-ink/75">Représente le 261. À Antananarivo, Madagascar, 261° WEAR te permet de choisir ta paire en ligne et de commander directement sur WhatsApp, dans le modèle et la pointure de ton choix.</p>
      <section><h2 className="font-display text-2xl">Sur commande ou déjà à Tana</h2><p className="mt-3 text-ink/75">Les articles sur commande sont achetés auprès de nos fournisseurs pour ta commande, avec un délai indicatif de {settings.deliveryMinDays} à {settings.deliveryMaxDays} jours après confirmation de l’acompte. Les paires disponibles de suite sont déjà en stock à Antananarivo, pour une livraison indicative en {settings.stockDeliveryMinDays} à {settings.stockDeliveryMaxDays} jours.</p></section>
      <section><h2 className="font-display text-2xl">Un prix en ariary, une commande confirmée ensemble</h2><p className="mt-3 text-ink/75">Chaque fiche affiche le prix de la paire et sa disponibilité. Tu confirmes ta pointure sur WhatsApp. L’acompte est de {settings.depositPct} % par Mobile Money, puis le solde se règle à la livraison. Les conditions complètes sont précisées dans nos CGV.</p></section>
      <section><h2 className="font-display text-2xl">De la sélection à la livraison</h2><p className="mt-3 text-ink/75">Une photo de contrôle qualité est transmise avant l’envoi. Si ta commande dispose d’un numéro de suivi, tu peux retrouver ses étapes sur le site avec ton numéro de commande et ton téléphone.</p></section>
      <div className="flex flex-wrap gap-4"><Link href="/chaussures" className="btn-dark">Choisir une paire</Link><Link href="/contact" className="btn-ghost">Contacter la boutique</Link></div>
      <p className="text-sm text-muted"><Link href="/faq" className="underline">Questions fréquentes</Link> · <Link href="/cgv" className="underline">Conditions générales de vente</Link></p>
    </div>
  );
}
