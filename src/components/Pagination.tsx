import Link from "next/link";
import { pageWindow } from "@/lib/pagination";

// Accessible numbered pagination. `hrefFor(page)` keeps the other URL params.
export function Pagination({
  page,
  pageCount,
  hrefFor,
  label = "Pagination",
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  label?: string;
}) {
  if (pageCount <= 1) return null;
  const base = "flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition";
  return (
    <nav aria-label={label} className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${base} border border-black/15 bg-white hover:border-ink`}>
          ‹ <span className="ml-1 hidden sm:inline">Précédent</span>
        </Link>
      ) : (
        <span className={`${base} border border-black/10 text-black/30`} aria-hidden="true">‹ <span className="ml-1 hidden sm:inline">Précédent</span></span>
      )}
      {pageWindow(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden="true">…</span>
        ) : p === page ? (
          <span key={p} aria-current="page" className={`${base} bg-ink text-white`}>{p}</span>
        ) : (
          <Link key={p} href={hrefFor(p)} aria-label={`Page ${p}`} className={`${base} border border-black/15 bg-white hover:border-ink`}>
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} rel="next" className={`${base} border border-black/15 bg-white hover:border-ink`}>
          <span className="mr-1 hidden sm:inline">Suivant</span> ›
        </Link>
      ) : (
        <span className={`${base} border border-black/10 text-black/30`} aria-hidden="true"><span className="mr-1 hidden sm:inline">Suivant</span> ›</span>
      )}
    </nav>
  );
}
