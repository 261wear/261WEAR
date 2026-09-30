"use client";

import { saveSupplier } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { useFormAction } from "@/components/useFormAction";
import type { Supplier } from "@/lib/suppliers";

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const [state, onSubmit, pending] = useFormAction(saveSupplier, undefined);
  return (
    <form onSubmit={onSubmit} className="card max-w-2xl space-y-4 p-6">
      {supplier && <input type="hidden" name="id" value={supplier.id} />}
      <div>
        <label className="label" htmlFor="name">Nom</label>
        <input id="name" name="name" className="input" defaultValue={supplier?.name} placeholder="Putian Shoes Co" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="wechat">WeChat ID</label>
          <input id="wechat" name="wechat" className="input" defaultValue={supplier?.wechat} />
        </div>
        <div>
          <label className="label" htmlFor="phone">Téléphone</label>
          <input id="phone" name="phone" className="input" defaultValue={supplier?.phone} placeholder="+86 …" />
        </div>
        <div>
          <label className="label" htmlFor="city">Ville</label>
          <input id="city" name="city" className="input" defaultValue={supplier?.city} placeholder="Putian, Guangzhou…" />
        </div>
        <div>
          <label className="label" htmlFor="lead_days">Délai d&apos;expédition habituel (jours)</label>
          <input id="lead_days" name="lead_days" className="input" inputMode="numeric" defaultValue={supplier?.lead_days ?? ""} placeholder="3" />
          <p className="mt-1 text-xs text-muted">Sert à signaler les commandes en retard dans « Logistique ».</p>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="payment">Paiement</label>
        <input id="payment" name="payment" className="input" defaultValue={supplier?.payment} placeholder="Alipay, WeChat Pay, via transitaire…" />
      </div>
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} className="input" defaultValue={supplier?.notes} placeholder="Qualité, minimum de commande, contact…" />
      </div>
      <FormMessage error={state?.error} />
      <Button type="submit" pending={pending} pendingLabel="Enregistrement…">{supplier ? "Enregistrer" : "Ajouter le fournisseur"}</Button>
    </form>
  );
}
