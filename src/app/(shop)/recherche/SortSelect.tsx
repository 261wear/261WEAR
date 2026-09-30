"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function SortSelect({ value, options, hrefFor }: { value: string; options: { id: string; label: string }[]; hrefFor: Record<string, string> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Trier par</span>
      <select
        value={value}
        onChange={(e) => startTransition(() => router.push(hrefFor[e.target.value]))}
        className="rounded-full border border-black/15 bg-white px-3 py-2 font-medium"
      >
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <span className={`transition-opacity ${pending ? "opacity-100" : "opacity-0"}`} aria-hidden="true"><Spinner /></span>
    </label>
  );
}
