"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ProductCard } from "@/components/ProductCard";
import { CATALOG_SLICE, type CardProduct } from "@/lib/card";

// Back from a product page: the slices already loaded and the scroll position
// come back, instead of restarting from the top of the list.
const BACK_KEY = "261-catalogue-retour";
const BACK_VALID_MS = 30 * 60 * 1000;

// Catalogue grid loaded in slices: the first comes with the page, the next one
// is asked well before the bottom of the list, so scrolling never hits a wait.
// The button does the same thing by hand (no IntersectionObserver, network cut).
export function CatalogGrid({
  initial,
  total,
  params,
  query,
}: {
  initial: CardProduct[];
  total: number;
  params: string; // current filters, without the page
  query: string;
}) {
  const [more, setMore] = useState<CardProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const restoreY = useRef<number | null>(null);

  useLayoutEffect(() => {
    let memo: { params: string; more: CardProduct[]; y: number; t: number } | null = null;
    try {
      memo = JSON.parse(sessionStorage.getItem(BACK_KEY) ?? "null");
      sessionStorage.removeItem(BACK_KEY);
    } catch {
      return;
    }
    if (!memo || memo.params !== params || Date.now() - memo.t > BACK_VALID_MS) return;
    restoreY.current = memo.y;
    // sessionStorage only exists in the browser: read after hydration, before paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMore(memo.more);
    // Mount only: the memo is only valid when arriving on the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    if (restoreY.current === null) return;
    window.scrollTo(0, restoreY.current);
    restoreY.current = null;
  }, [more]);

  const shown = useMemo(() => {
    // A pair published between two slices shifts the list: never show a card twice.
    const seen = new Set(initial.map((p) => p.id));
    return [...initial, ...more.filter((p) => !seen.has(p.id))];
  }, [initial, more]);
  const left = total - shown.length;

  const loadMore = useCallback(async () => {
    if (inFlight.current || left <= 0) return;
    inFlight.current = true;
    setLoading(true);
    setFailed(false);
    const q = new URLSearchParams(params);
    q.set("depuis", String(shown.length));
    try {
      const r = await fetch(`/api/catalogue?${q}`);
      if (!r.ok) throw new Error(String(r.status));
      const { products } = (await r.json()) as { products: CardProduct[] };
      setMore((m) => {
        const known = new Set([...initial, ...m].map((p) => p.id));
        return [...m, ...products.filter((p) => !known.has(p.id))];
      });
    } catch {
      setFailed(true); // mobile network dropped: the button stays, a tap retries
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [left, params, shown.length, initial]);

  // Recreated after each slice, so it fires again if the sentinel is still in view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || left <= 0 || failed || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void loadMore();
    }, { rootMargin: "0px 0px 1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, left, failed]);

  const remember = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('a[href^="/produit/"]')) return;
    try {
      sessionStorage.setItem(BACK_KEY, JSON.stringify({ params, more, y: window.scrollY, t: Date.now() }));
    } catch {
      // Storage full or refused (private browsing): back starts from the top.
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8 md:grid-cols-3" onClickCapture={remember}>
        {shown.map((p, i) => (
          <ProductCard key={p.id} product={p} query={query} priority={i < 4} />
        ))}
      </div>
      {left > 0 ? (
        <div ref={sentinel} className="mt-8 flex flex-col items-center gap-2">
          <button type="button" onClick={() => void loadMore()} disabled={loading} className="btn-ghost min-w-56">
            {loading ? "Chargement…" : `Voir les ${Math.min(left, CATALOG_SLICE)} suivantes`}
          </button>
          {failed && <p className="text-sm text-muted">Connexion interrompue. Touche le bouton pour réessayer.</p>}
          <p className="text-xs text-muted" aria-live="polite">{shown.length} sur {total} affichées</p>
        </div>
      ) : (
        total > CATALOG_SLICE && <p className="mt-8 text-center text-xs text-muted">Les {total} modèles sont affichés.</p>
      )}
    </>
  );
}
