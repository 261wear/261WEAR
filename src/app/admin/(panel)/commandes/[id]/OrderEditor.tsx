"use client";

import { useFormAction } from "@/components/useFormAction";
import { addProof, removeProof, saveOrderDetails } from "@/app/admin/actions";
import { PendingTiles, UploadTile, useUploads } from "@/components/admin/UploadTile";
import { Button, SubmitButton } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Img } from "@/components/ui/Img";

type Props = {
  id: number;
  amountPaid: number;
  deposit: number;
  total: number;
  trackingRef: string;
  adminNote: string;
  proofs: string[];
};

export function OrderEditor(p: Props) {
  const [state, onSubmit, pending] = useFormAction(saveOrderDetails, undefined);
  const uploads = useUploads("proofs", (url) => addProof(p.id, url));

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="card space-y-4 p-5">
        <h2 className="font-semibold">Paiement & suivi</h2>
        <input type="hidden" name="id" value={p.id} />
        <div>
          <label className="label" htmlFor="amount_paid">Montant reçu (Ar)</label>
          <input id="amount_paid" name="amount_paid" className="input" inputMode="numeric" defaultValue={p.amountPaid} />
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={(e) => ((e.currentTarget.form!.elements.namedItem("amount_paid") as HTMLInputElement).value = String(p.deposit))}>
              Acompte ({p.deposit.toLocaleString("fr-FR")})
            </button>
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={(e) => ((e.currentTarget.form!.elements.namedItem("amount_paid") as HTMLInputElement).value = String(p.total))}>
              Totalité ({p.total.toLocaleString("fr-FR")})
            </button>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="tracking_ref">Réf. colis transitaire (visible par le client)</label>
          <input id="tracking_ref" name="tracking_ref" className="input" defaultValue={p.trackingRef} />
        </div>
        <div>
          <label className="label" htmlFor="admin_note">Note interne</label>
          <textarea id="admin_note" name="admin_note" rows={3} className="input" defaultValue={p.adminNote} placeholder="Réf. MVola, fournisseur, prix d'achat réel…" />
        </div>
        <FormMessage error={state?.error} ok={pending ? undefined : state?.ok} />
        <Button type="submit" pending={pending} pendingLabel="Enregistrement…">Enregistrer</Button>
      </form>

      <div className="card p-5">
        <h2 className="font-semibold">Preuves de paiement</h2>
        <p className="mt-1 text-xs text-muted">Enregistre ici les captures reçues sur WhatsApp.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {p.proofs.map((url) => (
            <div key={url} className="group relative">
              <a href={url} target="_blank" rel="noopener">
                <Img src={url} alt="Preuve de paiement" className="aspect-[3/4] w-full rounded-lg border border-black/10 object-cover" />
              </a>
              <form action={removeProof}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="url" value={url} />
                <SubmitButton className="absolute top-1 right-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-black/70 px-1.5 text-xs text-white" aria-label="Supprimer la capture">✕</SubmitButton>
              </form>
            </div>
          ))}
          <PendingTiles count={uploads.remaining} className="aspect-[3/4]" />
          <UploadTile label="Ajouter une capture" className="aspect-[3/4]" pending={uploads.pending} progress={uploads.progress} onFiles={uploads.upload} />
        </div>
        {uploads.error && <div className="mt-2"><FormMessage error={uploads.error} /></div>}
      </div>
    </div>
  );
}
