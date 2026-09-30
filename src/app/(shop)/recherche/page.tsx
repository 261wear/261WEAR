import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { searchCatalog, SORTS, type CatalogQuery } from "@/lib/catalog";
import { waLink } from "@/lib/orders-shared";
import { formatAr } from "@/lib/pricing";
import { isProductStatus, productStatus } from "@/lib/product-status";
import { getSettings } from "@/lib/settings";
import { SortSelect } from "./SortSelect";

type Params = Record<string, string>;

export async function generateMetadata(props: PageProps<"/recherche">): Promise<Metadata> {
  const { q } = await props.searchParams;
  return { title: typeof q === "string" && q ? `Recherche « ${q} »` : "Catalogue", robots: { index: false } };
}

function href(current: Params, changes: Params) {
  const next = new URLSearchParams({ ...current, ...changes });
  for (const [k, v] of [...next.entries()]) if (!v) next.delete(k);
  const s = next.toString();
  return `/recherche${s ? `?${s}` : ""}`;
}

function FacetLink({ active, to, label, count }: { active: boolean; to: string; label: string; count: number }) {
  return (
    <Link
      href={to}
      aria-current={active ? "true" : undefined}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${active ? "bg-ink font-semibold text-white" : "hover:bg-black/5"}`}
    >
      <span>{active ? "✓ " : ""}{label}</span>
      <span className={active ? "text-white/70" : "text-muted"}>{count}</span>
    </Link>
  );
}

export default async function SearchPage(props: PageProps<"/recherche">) {
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).slice(0, 80) : "");
  const current: Params = Object.fromEntries(["q", "cat", "taille", "dispo", "min", "max", "tri"].map((k) => [k, one(k)]).filter(([, v]) => v));
  const num = (v: string) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);
  const query: CatalogQuery = {
    q: current.q,
    cat: current.cat,
    taille: current.taille,
    dispo: isProductStatus(current.dispo) && productStatus(current.dispo).isPublic ? current.dispo : undefined,
    min: num(current.min),
    max: num(current.max),
    tri: SORTS.some((s) => s.id === current.tri) ? current.tri : undefined,
  };
  const [{ results, facets, approximate, tri, total }, settings] = await Promise.all([searchCatalog(query), getSettings()]);
  const q = current.q ?? "";

  const chips = [
    current.cat && { key: "cat", label: current.cat },
    current.taille && { key: "taille", label: `Pointure ${current.taille}` },
    query.dispo && { key: "dispo", label: productStatus(query.dispo).label },
    (current.min || current.max) && {
      key: "prix",
      label: `${current.min ? formatAr(Number(current.min)) : "0"} – ${current.max ? formatAr(Number(current.max)) : "∞"}`,
    },
  ].filter(Boolean) as { key: string; label: string }[];
  const clear = (key: string) => href(current, key === "prix" ? { min: "", max: "" } : { [key]: "" });
  const filterCount = chips.length;

  const filters = (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Disponibilité</h2>
        {facets.availability.map((f) => (
          <FacetLink key={f.value} active={query.dispo === f.value} to={href(current, { dispo: query.dispo === f.value ? "" : f.value })} label={productStatus(f.value).label} count={f.count} />
        ))}
      </section>
      {facets.categories.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Catégorie</h2>
          {facets.categories.map((f) => (
            <FacetLink key={f.value} active={current.cat === f.value} to={href(current, { cat: current.cat === f.value ? "" : f.value })} label={f.value} count={f.count} />
          ))}
        </section>
      )}
      {facets.sizes.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Pointure</h2>
          <div className="grid grid-cols-4 gap-1.5">
            {facets.sizes.map((f) => {
              const on = current.taille === f.value;
              return (
                <Link
                  key={f.value}
                  href={href(current, { taille: on ? "" : f.value })}
                  aria-current={on ? "true" : undefined}
                  title={`${f.count} modèle${f.count > 1 ? "s" : ""}`}
                  className={`flex h-10 items-center justify-center rounded-lg border text-sm font-semibold ${on ? "border-ink bg-ink text-white" : "border-black/15 bg-white hover:border-black"}`}
                >
                  {f.value}
                </Link>
              );
            })}
          </div>
        </section>
      )}
      {facets.priceRange && (
        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Prix (Ar)</h2>
          <form action="/recherche" className="flex items-center gap-2">
            {Object.entries(current).filter(([k]) => !["min", "max"].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <input name="min" inputMode="numeric" defaultValue={current.min} placeholder={String(facets.priceRange.min)} aria-label="Prix minimum" className="input px-2 py-2 text-sm" />
            <span aria-hidden="true">–</span>
            <input name="max" inputMode="numeric" defaultValue={current.max} placeholder={String(facets.priceRange.max)} aria-label="Prix maximum" className="input px-2 py-2 text-sm" />
            <button className="btn-dark px-3 py-2" aria-label="Appliquer le filtre de prix">OK</button>
          </form>
        </section>
      )}
    </div>
  );

  const sortHrefs = Object.fromEntries(SORTS.map((s) => [s.id, href(current, { tri: s.id })]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">{q ? `« ${q} »` : "Catalogue"}</h1>
          <p className="mt-1 text-sm text-muted" aria-live="polite">
            {results.length} résultat{results.length > 1 ? "s" : ""}
            {!q && !filterCount ? "" : ` sur ${total} modèles`}
          </p>
        </div>
        <SortSelect value={tri} options={[...SORTS]} hrefFor={sortHrefs} />
      </div>

      {approximate && results.length > 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Aucun modèle ne correspond exactement à « {q} ». Voici les résultats les plus proches.
        </p>
      )}

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <Link key={c.key} href={clear(c.key)} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-sm text-white hover:bg-black/80" aria-label={`Retirer le filtre ${c.label}`}>
              {c.label} <span aria-hidden="true">✕</span>
            </Link>
          ))}
          <Link href={href({ q }, {})} className="text-sm underline">Tout effacer</Link>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside>
          <details className="card group p-4 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              Filtres {filterCount > 0 && `(${filterCount})`}
              <span className="transition group-open:rotate-180" aria-hidden="true">▾</span>
            </summary>
            <div className="mt-4">{filters}</div>
          </details>
          <div className="hidden lg:block">{filters}</div>
        </aside>

        <section aria-label="Résultats">
          {results.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} query={q} />
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="font-display text-2xl">Aucun résultat</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-black/60">
                {filterCount ? "Essaie de retirer un filtre, ou " : "Vérifie l'orthographe, essaie un mot plus court, ou "}
                envoie-nous une photo du modèle que tu cherches : on le trouve pour toi chez nos fournisseurs.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {filterCount > 0 && <Link href={href({ q }, {})} className="btn-ghost">Retirer les filtres</Link>}
                <a
                  href={waLink(settings.whatsapp, `Bonjour 261 WEAR ! Je cherche ce modèle${q ? ` (« ${q} »)` : ""}, vous pouvez le trouver ? Je vous envoie une photo.`)}
                  target="_blank"
                  rel="noopener"
                  className="btn bg-[#25D366] text-white hover:brightness-95"
                >
                  <WhatsAppIcon /> Demander ce modèle
                </a>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
