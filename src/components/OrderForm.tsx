"use client";

import { useFormAction } from "@/components/useFormAction";
import Link from "next/link";
import { useState } from "react";
import { placeOrder } from "@/app/actions";
import { Button } from "./ui/Button";
import { FormMessage } from "./ui/FormMessage";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function OrderForm({ productId, sizes }: { productId: number; sizes: string[] }) {
  const [state, onSubmit, pending] = useFormAction(placeOrder, undefined);
  const [size, setSize] = useState("");
  return (
    <form onSubmit={onSubmit} className="space-y-5" aria-busy={pending}>
      <fieldset disabled={pending} className="contents">
      <input type="hidden" name="productId" value={productId} />
      {sizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <span className="label">Pointure (EU)</span>
            <Link href="/guide-des-tailles" className="text-xs underline">Guide des tailles</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <label
                key={s}
                className={`flex h-11 min-w-12 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-semibold transition ${
                  size === s ? "border-ink bg-ink text-white" : "border-black/15 bg-white hover:border-black"
                }`}
              >
                <input type="radio" name="size" value={s} className="sr-only" onChange={() => setSize(s)} required />
                {s}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nom</label>
          <input id="name" name="name" className="input" autoComplete="name" required />
        </div>
        <div>
          <label className="label" htmlFor="phone">Téléphone (WhatsApp)</label>
          <input id="phone" name="phone" className="input" inputMode="tel" autoComplete="tel" placeholder="034 12 345 67" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="address">Quartier / adresse de livraison à Tana</label>
        <input id="address" name="address" className="input" placeholder="Ex : Ivandry, près de…" required />
      </div>
      <div>
        <label className="label" htmlFor="note">Remarque (facultatif)</label>
        <textarea id="note" name="note" rows={2} className="input" />
      </div>
      <FormMessage error={state?.error} />
      <Button type="submit" pending={pending} pendingLabel="Création de la commande…" icon={<WhatsAppIcon />} className="btn-dark w-full py-4 text-base">
        Commander via WhatsApp
      </Button>
      <p className="text-center text-xs text-muted">
        Ta commande est enregistrée, puis tu l&apos;envoies sur WhatsApp avec ta capture de paiement.
      </p>
      </fieldset>
    </form>
  );
}
