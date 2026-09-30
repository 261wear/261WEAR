"use client";

import { useFormAction } from "@/components/useFormAction";
import { trackOrder } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";

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
      <FormMessage error={state?.error} />
      <Button type="submit" pending={pending} pendingLabel="Recherche…" className="btn-dark w-full">Suivre mon colis</Button>
    </form>
  );
}
