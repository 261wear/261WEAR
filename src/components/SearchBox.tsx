"use client";

import { thumbUrl } from "@/lib/images";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { formatAr } from "@/lib/pricing";
import { productStatus, STATUS_BADGE, type ProductStatus } from "@/lib/product-status";
import { Highlight } from "./Highlight";
import { Img } from "./ui/Img";
import { Spinner } from "./ui/Spinner";

type Suggest = {
  products: { id: number; name: string; category: string; price: number; image: string | null; status: ProductStatus }[];
  categories: { value: string; count: number }[];
  total: number;
};
type Option = { key: string; href: string; recent?: string };

const RECENT_KEY = "261wear:recent-searches";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]").slice(0, 5);
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  try {
    const list = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Private mode / blocked storage: recent searches are just a convenience.
  }
}

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export function SearchBox({ popular, initialQuery = "" }: { popular: { value: string; count: number }[]; initialQuery?: string }) {
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // On the results page the box always shows the current query (also when the
  // page is opened from a link or with the back button).
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQuery = pathname === "/recherche" ? (params.get("q") ?? "") : null;
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  const [q, setQ] = useState(urlQuery ?? initialQuery);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Suggest | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    if (urlQuery !== null) setQ(urlQuery);
  }

  const query = q.trim();

  // "/" focuses the search from anywhere (like GitHub, YouTube…).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Debounced suggestions; stale requests are aborted.
  useEffect(() => {
    if (!query) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
        setActive(-1);
      } catch {
        // Aborted, offline or server error: keep the previous suggestions.
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const options: Option[] = query
    ? [
        ...(data?.categories ?? []).map((c) => ({ key: `c:${c.value}`, href: `/recherche?q=${encodeURIComponent(query)}&cat=${encodeURIComponent(c.value)}` })),
        ...(data?.products ?? []).map((p) => ({ key: `p:${p.id}`, href: `/produit/${p.id}` })),
        { key: "all", href: `/recherche?q=${encodeURIComponent(query)}` },
      ]
    : [
        ...recent.map((r) => ({ key: `r:${r}`, href: `/recherche?q=${encodeURIComponent(r)}`, recent: r })),
        ...popular.map((c) => ({ key: `c:${c.value}`, href: `/recherche?cat=${encodeURIComponent(c.value)}` })),
      ];

  function go(href: string, term?: string) {
    if (term) saveRecent(term);
    setOpen(false);
    // Opening a product ends the search: next focus shows recent searches again.
    if (href.startsWith("/produit/")) {
      setQ("");
      setData(null);
    }
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(href);
  }

  function submit() {
    if (active >= 0 && options[active]) return go(options[active].href, query || options[active].recent);
    if (query) go(`/recherche?q=${encodeURIComponent(query)}`, query);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const n = options.length;
      if (!n) return;
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
    } else if (e.key === "Escape") {
      if (open) setOpen(false);
      else setQ("");
    }
  }

  const optionProps = (index: number) => ({
    id: `${id}-opt-${index}`,
    role: "option" as const,
    "aria-selected": active === index,
    onMouseEnter: () => setActive(index),
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(), // keep focus in the input
    onClick: () => go(options[index].href, query || options[index].recent),
    className: `flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm ${active === index ? "bg-paper" : ""}`,
  });

  const catOffset = 0;
  const prodOffset = query ? (data?.categories.length ?? 0) : 0;
  const showPanel = open && (query ? true : recent.length + popular.length > 0);

  return (
    <div ref={rootRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2 rounded-full bg-white px-4 text-ink ring-2 ring-transparent transition focus-within:ring-accent"
      >
        <SearchIcon className="h-5 w-5 shrink-0 text-black/40" />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) setData(null);
          }}
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Rechercher un modèle, une pointure…"
          aria-label="Rechercher dans la boutique"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          enterKeyHint="search"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-black/40 [&::-webkit-search-cancel-button]:hidden"
        />
        {loading && <Spinner className="h-4 w-4 text-black/40" />}
        {q && (
          <button type="button" onClick={() => { setQ(""); setData(null); inputRef.current?.focus(); }} className="rounded-full p-1 text-black/40 hover:text-ink" aria-label="Effacer la recherche">
            ✕
          </button>
        )}
        <kbd className="hidden rounded border border-black/15 px-1.5 text-xs text-black/40 lg:block" aria-hidden="true">/</kbd>
      </form>

      {showPanel && (
        <div id={listId} role="listbox" aria-label="Suggestions" className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-auto rounded-2xl bg-white py-2 text-ink shadow-2xl ring-1 ring-black/10">
          {!query && (
            <>
              {recent.length > 0 && (
                <div className="flex items-center justify-between px-4 pt-1 pb-1">
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">Recherches récentes</p>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      try { localStorage.removeItem(RECENT_KEY); } catch {}
                      setRecent([]);
                    }}
                    className="text-xs underline"
                  >
                    Effacer
                  </button>
                </div>
              )}
              {recent.map((r, i) => (
                <div key={r} {...optionProps(i)}>
                  <span className="text-black/40">↺</span> {r}
                </div>
              ))}
              {popular.length > 0 && <p className="px-4 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">Catégories</p>}
              {popular.map((c, i) => (
                <div key={c.value} {...optionProps(recent.length + i)}>
                  <SearchIcon className="h-4 w-4 text-black/40" />
                  <span className="flex-1">{c.value}</span>
                  <span className="text-xs text-muted">{c.count}</span>
                </div>
              ))}
            </>
          )}

          {query && data && (
            <>
              {data.categories.map((c, i) => (
                <div key={c.value} {...optionProps(catOffset + i)}>
                  <SearchIcon className="h-4 w-4 text-black/40" />
                  <span className="flex-1">
                    <b>{query}</b> dans <span className="font-semibold">{c.value}</span>
                  </span>
                  <span className="text-xs text-muted">{c.count}</span>
                </div>
              ))}
              {data.products.length > 0 && <p className="px-4 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">Modèles</p>}
              {data.products.map((p, i) => (
                <div key={p.id} {...optionProps(prodOffset + i)}>
                  {p.image ? (
                    <Img src={thumbUrl(p.image)} fallback={p.image} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-paper object-cover" />
                  ) : (
                    <span className="h-11 w-11 shrink-0 rounded-lg bg-paper" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium"><Highlight text={p.name} query={query} /></span>
                    <span className="text-xs text-muted">{p.category}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-semibold">{formatAr(p.price)}</span>
                    {p.status !== "sur_commande" && (
                      <span className={`mt-0.5 inline-block rounded-full px-1.5 text-[10px] font-semibold ${STATUS_BADGE[p.status]}`}>{productStatus(p.status).short}</span>
                    )}
                  </span>
                </div>
              ))}
              {data.total === 0 ? (
                <p className="px-4 py-3 text-sm text-black/60">
                  Aucun modèle pour « {query} ». Essaie un autre mot, ou envoie-nous une photo du modèle sur WhatsApp : on le trouve pour toi.
                </p>
              ) : null}
              <div {...optionProps(options.length - 1)}>
                <span className="font-semibold underline">
                  {data.total > 1 ? `Voir les ${data.total} résultats pour « ${query} »` : data.total === 1 ? `Voir le résultat pour « ${query} »` : `Rechercher « ${query} »`}
                </span>
              </div>
            </>
          )}
          {query && !data && loading && <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted"><Spinner /> Recherche…</p>}
        </div>
      )}
    </div>
  );
}
