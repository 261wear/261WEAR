"use client";

import { useState, useTransition } from "react";
import { setProductStatus } from "@/app/admin/actions";
import { Spinner } from "@/components/ui/Spinner";
import { PRODUCT_STATUSES, STATUS_BADGE, type ProductStatus } from "@/lib/product-status";

// Changes the status right from the list, with a pending indicator. The server
// applies the same rules as the product form (e.g. stock needs a price in Ar).
export function StatusSelect({ id, status, name }: { id: number; status: ProductStatus; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className="inline-flex items-center gap-1.5">
        <select
          value={status}
          disabled={pending}
          aria-label={`Statut de ${name}`}
          aria-describedby={error ? `status-err-${id}` : undefined}
          onChange={(e) => {
            const form = new FormData();
            form.set("id", String(id));
            form.set("status", e.target.value);
            setError("");
            startTransition(async () => {
              const res = await setProductStatus(form);
              if (res.error) setError(res.error);
            });
          }}
          className={`cursor-pointer rounded-full border-0 py-1 pr-7 pl-2.5 text-xs font-semibold disabled:opacity-60 ${STATUS_BADGE[status]}`}
        >
          {PRODUCT_STATUSES.map((s) => <option key={s.id} value={s.id} className="bg-white text-ink">{s.short}</option>)}
        </select>
        {pending && <Spinner className="h-3.5 w-3.5 text-black/50" />}
      </span>
      {error && <span id={`status-err-${id}`} role="alert" className="max-w-56 text-xs text-red-700">{error}</span>}
    </span>
  );
}
