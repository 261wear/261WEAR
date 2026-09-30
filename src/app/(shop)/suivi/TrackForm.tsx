"use client";

import { useFormAction } from "@/components/useFormAction";
import { trackOrder } from "@/app/actions";

export function TrackForm({ defaultNumber }: { defaultNumber?: string }) {
  const [state, onSubmit, pending] = useFormAction(trackOrder, undefined);
  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="number">Numéro de commande</label>
        <input id="number" name="number" className="input" placeholder="261-0001" defaultValue={defaultNumber} required />
      </div>
      <div>
        <label className="label" htmlFor="phone">Téléphone utilisé pour la commande</label>
        <input id="phone" name="phone" className="input" inputMode="tel" placeholder="034 12 345 67" required />
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button className="btn-dark w-full" disabled={pending}>{pending ? "Recherche…" : "Suivre mon colis"}</button>
    </form>
  );
}
