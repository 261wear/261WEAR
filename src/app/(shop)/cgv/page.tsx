import type { Metadata } from "next";
import { shopSettings } from "@/lib/catalog";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default async function CgvPage() {
  const s = await shopSettings();
  const sections: [string, string][] = [
    [
      "1. Objet",
      "Les présentes conditions régissent les ventes de chaussures réalisées par 261 WEAR (Antananarivo, Madagascar) via son site, WhatsApp, Facebook et Instagram. Toute commande implique leur acceptation.",
    ],
    [
      "2. Commande sur mesure",
      "Les articles « sur commande » sont commandés spécialement pour chaque client auprès de nos fournisseurs, dans le modèle et la pointure choisis. Les articles « disponibles de suite » sont déjà en stock à Antananarivo. Un article « épuisé » ne peut pas être commandé. La commande est enregistrée sur le site puis confirmée par WhatsApp.",
    ],
    [
      "3. Prix et paiement",
      `Les prix sont indiqués en Ariary, livraison à Antananarivo incluse. Un acompte de ${s.depositPct} % est payé à la commande par Mobile Money (MVola, Orange Money, Airtel Money) ; la capture du paiement est envoyée sur WhatsApp. La commande n'est lancée qu'après réception de l'acompte. Le solde est payé à la livraison. Le prix confirmé à la commande ne change plus.`,
    ],
    [
      "4. Délais de livraison",
      `Articles « sur commande » : livraison en ${s.deliveryMinDays} à ${s.deliveryMaxDays} jours après confirmation de l'acompte. Articles « disponibles de suite » (déjà à Antananarivo) : livraison en ${s.stockDeliveryMinDays} à ${s.stockDeliveryMaxDays} jours. Ces délais sont indicatifs. Des retards indépendants de notre volonté (transport aérien, douane, intempéries) peuvent survenir ; le client en est informé et peut suivre sa commande en ligne. Au-delà de 25 jours de retard, le client peut demander l'annulation et le remboursement de son acompte.`,
    ],
    [
      "5. Pointures",
      "Le client choisit sa pointure à l'aide du guide des tailles et la confirme par écrit. Une erreur de pointure du client ne donne pas droit à un remboursement ; un échange peut être proposé selon disponibilité, les frais de transport restant à la charge du client.",
    ],
    [
      "6. Contrôle qualité et photos",
      "Les visuels du site sont fournis par nos fournisseurs ; de légères variations de teinte sont possibles. Avant l'envoi, une photo de contrôle qualité de la paire du client lui est transmise : c'est cette photo qui fait foi.",
    ],
    [
      "7. Annulation",
      "Le client peut annuler gratuitement tant que la commande n'a pas été passée chez le fournisseur. Une fois la commande passée, l'acompte n'est plus remboursable, sauf retard prévu à l'article 4.",
    ],
    [
      "8. Défauts et garantie",
      "Tout défaut ou erreur de modèle doit être signalé sur WhatsApp dans les 48 heures suivant la livraison, photos à l'appui. 261 WEAR procède alors à l'échange ou au remboursement. Les coutures et le collage des semelles sont garantis 30 jours dans le cadre d'un usage normal.",
    ],
    [
      "9. Livraison",
      "La livraison est assurée à Antananarivo à l'adresse indiquée. Pour les autres villes, l'envoi se fait par transporteur ou coopérative, aux frais du client. Le client vérifie sa paire à la réception.",
    ],
    [
      "10. Données personnelles",
      "Le nom, le téléphone et l'adresse du client sont utilisés uniquement pour traiter et livrer sa commande. Ils ne sont jamais revendus.",
    ],
    [
      "11. Litiges",
      "En cas de désaccord, les parties recherchent d'abord une solution amiable. À défaut, le droit malgache s'applique, notamment la législation relative à la protection des consommateurs.",
    ],
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl">Conditions générales de vente</h1>
      <div className="mt-8 space-y-6">
        {sections.map(([title, body]) => (
          <section key={title}>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-black/75">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
