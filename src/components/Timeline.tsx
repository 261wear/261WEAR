import { CANCELLED, stepsFor } from "@/lib/orders-shared";
import type { HistoryEntry } from "@/lib/orders";

function fmt(at: string) {
  return new Date(at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Indian/Antananarivo",
  });
}

export function Timeline({ status, history, inStock = false }: { status: string; history: HistoryEntry[]; inStock?: boolean }) {
  if (status === CANCELLED.id) {
    return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Commande annulée.</p>;
  }
  const steps = stepsFor(inStock);
  const current = steps.findIndex((s) => s.id === status);
  return (
    <ol className="relative space-y-6 border-l-[3px] border-ink/10 pl-8">
      {steps.map((s, i) => {
        const done = i <= current;
        const entry = [...history].reverse().find((h) => h.status === s.id);
        return (
          <li key={s.id} className="relative">
            <span
              className={`absolute top-0.5 -left-[43px] flex h-5 w-5 items-center justify-center rounded-full border-[3px] ${
                i === current ? "border-ink bg-pistachio ring-4 ring-pistachio" : done ? "border-ink bg-ink" : "border-black/15 bg-white"
              }`}
            />
            <p className={`font-display text-lg leading-tight ${done ? "" : "text-ink/35"}`}>{s.step}</p>
            {entry && done && (
              <p className="mt-0.5 text-sm text-ink/65">
                {fmt(entry.at)}
                {entry.note ? ` · ${entry.note}` : ""}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
