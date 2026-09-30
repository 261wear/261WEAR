"use client";

import { useFormAction } from "@/components/useFormAction";
import { updateSettings } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import type { Settings } from "@/lib/settings";

const PRICING: [keyof Settings, string, string][] = [
  ["rmbRate", "Taux de change : 1 RMB = … Ar", "Vérifie le taux avant chaque drop."],
  ["transportPerKg", "Transport Chine → Tana (Ar / kg)", ""],
  ["defaultWeightKg", "Poids par défaut d'une paire (kg)", "Boîte comprise. Modifiable produit par produit."],
  ["marginPct", "Marge par défaut (%)", "Appliquée sur le coût de revient."],
  ["fixedFees", "Frais fixes par paire (Ar)", "Emballage, livraison à Tana, frais Mobile Money…"],
  ["roundTo", "Arrondir le prix au-dessus à (Ar)", "Ex : 5000 → 187 300 devient 190 000."],
];

const ORDERS: [keyof Settings, string][] = [
  ["depositPct", "Acompte à la commande (%)"],
  ["deliveryMinDays", "Délai minimum (jours)"],
  ["deliveryMaxDays", "Délai maximum (jours)"],
];

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, onSubmit, pending] = useFormAction(updateSettings, undefined);
  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
      <div className="card space-y-4 p-5">
        <h2 className="font-semibold">Calcul automatique des prix</h2>
        {PRICING.map(([key, label, help]) => (
          <div key={key}>
            <label className="label" htmlFor={key}>{label}</label>
            <input id={key} name={key} className="input" inputMode="decimal" defaultValue={String(settings[key])} required />
            {help && <p className="mt-1 text-xs text-muted">{help}</p>}
          </div>
        ))}
        <p className="rounded-lg bg-paper p-3 text-xs">
          Prix de vente = (prix RMB × taux + poids × transport + frais fixes) × (1 + marge), arrondi au-dessus.
        </p>
      </div>
      <div className="space-y-6">
        <div className="card space-y-4 p-5">
          <h2 className="font-semibold">Commandes & WhatsApp</h2>
          <div>
            <label className="label" htmlFor="whatsapp">Numéro WhatsApp de la boutique</label>
            <input id="whatsapp" name="whatsapp" className="input" defaultValue={settings.whatsapp} required />
            <p className="mt-1 text-xs text-muted">Ex : 034 12 345 67. Les commandes y sont envoyées.</p>
          </div>
          <div>
            <label className="label" htmlFor="paymentInfo">Instructions de paiement (affichées au client)</label>
            <textarea id="paymentInfo" name="paymentInfo" rows={4} className="input font-mono text-sm" defaultValue={settings.paymentInfo} />
          </div>
          {ORDERS.map(([key, label]) => (
            <div key={key}>
              <label className="label" htmlFor={key}>{label}</label>
              <input id={key} name={key} className="input" inputMode="numeric" defaultValue={String(settings[key])} required />
            </div>
          ))}
        </div>
        <FormMessage error={state?.error} ok={pending ? undefined : state?.ok} />
        <Button type="submit" pending={pending} pendingLabel="Enregistrement…" className="btn-dark w-full py-4">Enregistrer</Button>
      </div>
    </form>
  );
}
