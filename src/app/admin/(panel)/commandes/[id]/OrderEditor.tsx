"use client";

import { useFormAction } from "@/components/useFormAction";
import { useState, useTransition } from "react";
import { addProof, removeProof, saveOrderDetails } from "@/app/admin/actions";
import { uploadImage } from "@/components/admin/upload";

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
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState("");

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError("");
    startUpload(async () => {
      try {
        for (const file of Array.from(files)) {
          await addProof(p.id, await uploadImage(file, "proofs"));
        }
      } catch (err) {
        setUploadError((err as Error).message);
      }
    });
  }

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
        {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
        {state?.ok && <p className="text-sm text-green-700">{state.ok}</p>}
        <button className="btn-dark" disabled={pending}>Enregistrer</button>
      </form>

      <div className="card p-5">
        <h2 className="font-semibold">Preuves de paiement</h2>
        <p className="mt-1 text-xs text-muted">Enregistre ici les captures reçues sur WhatsApp.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {p.proofs.map((url) => (
            <div key={url} className="group relative">
              <a href={url} target="_blank" rel="noopener">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Preuve de paiement" className="aspect-[3/4] w-full rounded-lg border border-black/10 object-cover" />
              </a>
              <form action={removeProof}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="url" value={url} />
                <button className="absolute top-1 right-1 rounded-full bg-black/70 px-2 text-xs text-white" aria-label="Supprimer">✕</button>
              </form>
            </div>
          ))}
          <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-black/20 text-center text-xs text-muted hover:border-black">
            <span className="text-2xl">+</span>
            {uploading ? "Envoi…" : "Ajouter une capture"}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} disabled={uploading} />
          </label>
        </div>
        {uploadError && <p className="mt-2 text-sm text-red-700">{uploadError}</p>}
      </div>
    </div>
  );
}
