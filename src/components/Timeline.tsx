import { CANCELLED, STATUSES, statusIndex } from "@/lib/orders-shared";
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

export function Timeline({ status, history }: { status: string; history: HistoryEntry[] }) {
  if (status === CANCELLED.id) {
    return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Commande annulée.</p>;
  }
  const current = statusIndex(status);
  return (
    <ol className="relative space-y-5 border-l-2 border-black/10 pl-6">
      {STATUSES.map((s, i) => {
        const done = i <= current;
        const entry = [...history].reverse().find((h) => h.status === s.id);
        return (
          <li key={s.id} className="relative">
            <span
              className={`absolute top-0.5 -left-[33px] flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                i === current ? "border-ink bg-accent" : done ? "border-ink bg-ink" : "border-black/20 bg-white"
              }`}
            />
            <p className={`font-semibold ${done ? "" : "text-black/35"}`}>{s.step}</p>
            {entry && done && (
              <p className="text-xs text-black/50">
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
