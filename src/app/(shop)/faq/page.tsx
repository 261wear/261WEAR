import type { Metadata } from "next";
import Link from "next/link";
import { shopSettings } from "@/lib/catalog";
import { pageUrls } from "@/lib/site";

export const metadata: Metadata = {
  ...pageUrls("/faq"), title: "Questions fréquentes — commande et livraison à Tana",
  description: "Comment acheter des chaussures chez 261° WEAR : commande sur WhatsApp, acompte Mobile Money, délais à Antananarivo, pointures et suivi.",
};

export default async function Faq() {
  const s = await shopSettings();
  const questions = [
    ["Comment commander une paire ?", "Choisis un modèle dans le catalogue, ouvre sa fiche et sélectionne ta pointure. Le bouton WhatsApp prépare le message avec le modèle et le lien de la paire. Confirme ta commande avec la boutique."],
    ["Quel est le délai de livraison à Tana ?", `Pour une paire sur commande, compte ${s.deliveryMinDays} à ${s.deliveryMaxDays} jours après confirmation de l’acompte. Une paire disponible de suite est déjà à Antananarivo : le délai indicatif est de ${s.stockDeliveryMinDays} à ${s.stockDeliveryMaxDays} jours.`],
    ["Comment payer ?", `Les prix sont en ariary. Un acompte de ${s.depositPct} % se règle par Mobile Money : MVola, Orange Money ou Airtel Money. Envoie la capture du paiement à la boutique sur WhatsApp. Le solde est payé à la livraison.`],
    ["Comment choisir ma pointure ?", "Mesure ton pied en centimètres et consulte le guide des tailles. Les pointures varient selon les modèles : en cas de doute, demande conseil à la boutique avant de confirmer."],
    ["Comment suivre ma commande ?", "Sur la page Suivi, renseigne ton numéro de commande et le téléphone utilisé pour la commande. Tu peux également contacter la boutique sur WhatsApp."],
    ["Peut-on livrer en dehors d’Antananarivo ?", "Pour une autre ville, contacte la boutique avant de commander. Un envoi par transporteur ou coopérative peut être organisé aux frais du client, selon les conditions de vente."],
    ["Que faire si la paire présente un défaut ?", "Signale le défaut ou l’erreur de modèle sur WhatsApp dans les 48 heures suivant la livraison, avec des photos. Les conditions d’échange, de remboursement et de garantie sont détaillées dans les CGV."],
  ];
  return <div className="mx-auto max-w-3xl px-4 py-12">
    <h1 className="font-display text-4xl leading-tight sm:text-5xl">Acheter tes chaussures chez 261° WEAR : les questions fréquentes</h1>
    <div className="mt-8 space-y-7">{questions.map(([q, answer]) => <section key={q}><h2 className="font-display text-2xl">{q}</h2><p className="mt-3 text-ink/75">{answer}</p></section>)}</div>
    <div className="mt-8 flex flex-wrap gap-5 text-sm underline"><Link href="/contact" className="py-2">Contacter la boutique</Link><Link href="/guide-des-tailles" className="py-2">Guide des tailles</Link><Link href="/suivi" className="py-2">Suivre une commande</Link><Link href="/cgv" className="py-2">Conditions de vente</Link></div>
  </div>;
}
