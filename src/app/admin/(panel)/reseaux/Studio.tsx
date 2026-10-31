"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Img } from "@/components/ui/Img";
import { thumbUrl } from "@/lib/images";
import { formatAr } from "@/lib/pricing";
import { productStatus, STATUS_BADGE } from "@/lib/product-status";
import {
  buildCaption,
  defaultTitle,
  FORMATS,
  frameFor,
  FRAMES,
  NETWORK_TIPS,
  NETWORKS,
  shortLink,
  TITLE_MAX,
  type Delivery,
  type FormatId,
  type FrameChoice,
  type NetworkId,
  type PhotoFit,
} from "@/lib/social";
import { makeZip } from "@/lib/zip";
import { searchStudioProducts, type StudioProduct } from "./actions";

// Instagram takes up to 20 photos per carousel, Facebook 10, TikTok 35.
const MAX_SLIDES = 20;
const DEFAULT_PHOTOS = 3;

type Slide = { key: string; product: StudioProduct; photo: number; url: string; fileName: string };

function slug(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40).replace(/^-+|-+$/g, "") || "paire";
}

// The PNG rendered by the server, re-encoded in JPEG (~4× lighter, what the
// networks expect): faster to save on a phone and to post on mobile data.
async function toJpeg(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Conversion impossible"))), "image/jpeg", 0.92));
}

const noop = () => () => {};

// Phones: the share sheet saves the photos to the gallery or sends them
// straight to Instagram / TikTok. Computers get a .zip instead.
function canShareFiles() {
  try {
    const probe = new File([new Uint8Array(1)], "a.jpg", { type: "image/jpeg" });
    return Boolean(navigator.canShare?.({ files: [probe] })) && matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

function saveBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function Studio({ initial, preselected, origin, delivery }: { initial: StudioProduct[]; preselected: StudioProduct[]; origin: string; delivery: Delivery }) {
  const [results, setResults] = useState(initial);
  const [search, setSearch] = useState("");
  const [searching, startSearch] = useTransition();
  const [selected, setSelected] = useState<StudioProduct[]>(preselected);
  const [photos, setPhotos] = useState<Record<number, number[]>>(() =>
    Object.fromEntries(preselected.map((p) => [p.id, p.images.slice(0, DEFAULT_PHOTOS).map((_, i) => i)])),
  );
  const [frame, setFrame] = useState<FrameChoice>("auto");
  const [format, setFormat] = useState<FormatId>("4x5");
  const [fit, setFit] = useState<PhotoFit>("cover");
  const [title, setTitle] = useState("");
  const [showPrice, setShowPrice] = useState(true);
  const [network, setNetwork] = useState<NetworkId>("instagram");
  const [custom, setCustom] = useState<Partial<Record<NetworkId, string>>>({});
  const canShare = useSyncExternalStore(noop, canShareFiles, () => false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const cache = useRef(new Map<string, Promise<Blob>>());


  // Search as you type (pairs on the shop, with photos).
  const searched = useRef(false);
  useEffect(() => {
    const q = search.trim();
    if (!searched.current && !q) return; // first render: the server already sent the list
    searched.current = true;
    const t = setTimeout(() => startSearch(async () => setResults(await searchStudioProducts(q))), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [search]);

  const slides: Slide[] = useMemo(() => {
    const out: Slide[] = [];
    for (const p of selected) {
      const f = frameFor(frame, p.status);
      for (const i of photos[p.id] ?? []) {
        const params = new URLSearchParams({ id: String(p.id), photo: String(i), frame: f, format, fit, price: showPrice ? "1" : "0" });
        if ((f === "pellicule" || f === "polaroid") && title.trim()) params.set("title", title.trim());
        out.push({ key: `${p.id}-${i}`, product: p, photo: i, url: `/api/studio?${params}`, fileName: "" });
      }
    }
    return out.slice(0, MAX_SLIDES).map((s, n) => ({ ...s, fileName: `261wear-${slug(s.product.name)}-${n + 1}-${format}.jpg` }));
  }, [selected, photos, frame, format, fit, title, showPrice]);

  const tooMany = selected.reduce((n, p) => n + (photos[p.id]?.length ?? 0), 0) > MAX_SLIDES;
  const products = selected.filter((p) => slides.some((s) => s.product.id === p.id));
  const caption = custom[network] ?? buildCaption(network, products, origin, delivery);
  const usedFrames = new Set(selected.map((p) => frameFor(frame, p.status)));
  const titled = usedFrames.has("pellicule") || usedFrames.has("polaroid");

  function getJpeg(url: string) {
    let p = cache.current.get(url);
    if (!p) {
      p = fetch(url).then(async (res) => {
        if (!res.ok) throw new Error((await res.text()) || `Erreur ${res.status}`);
        return toJpeg(await res.blob());
      });
      p.catch(() => cache.current.delete(url));
      cache.current.set(url, p);
    }
    return p;
  }

  // Three at a time: the server renders each photo, no need to start 20 at once.
  async function prepare(list: Slide[], onProgress?: (done: number) => void) {
    const out: Blob[] = new Array(list.length);
    let done = 0;
    let next = 0;
    async function worker() {
      while (next < list.length) {
        const i = next++;
        out[i] = await getJpeg(list[i].url);
        onProgress?.(++done);
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    return out;
  }

  // On phones, files are prepared ahead: the share sheet must open right on the tap.
  const [ready, setReady] = useState<{ sig: string; files: File[] } | null>(null);
  const [prepFailed, setPrepFailed] = useState<{ sig: string; text: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const sig = slides.map((s) => s.url).join("|");
  useEffect(() => {
    if (!canShare || !slides.length) return;
    let alive = true;
    const t = setTimeout(() => {
      prepare(slides)
        .then((blobs) => alive && setReady({ sig, files: blobs.map((b, i) => new File([b], slides[i].fileName, { type: "image/jpeg" })) }))
        .catch((err) => alive && setPrepFailed({ sig, text: (err as Error).message }));
    }, 600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canShare, sig, attempt]);

  function toggleProduct(p: StudioProduct) {
    setNotice(null);
    setCustom({});
    if (selected.some((s) => s.id === p.id)) {
      setSelected(selected.filter((s) => s.id !== p.id));
      return;
    }
    setSelected([...selected, p]);
    setPhotos((ph) => ({ ...ph, [p.id]: ph[p.id] ?? p.images.slice(0, DEFAULT_PHOTOS).map((_, i) => i) }));
  }

  function togglePhoto(p: StudioProduct, i: number) {
    setNotice(null);
    setPhotos((ph) => {
      const cur = ph[p.id] ?? [];
      return { ...ph, [p.id]: cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort((a, b) => a - b) };
    });
  }

  function pickFrame(f: FrameChoice) {
    setFrame(f);
    // A delivered customer's photo is about trust, not price.
    setShowPrice(f !== "polaroid");
  }

  async function downloadAll() {
    setNotice(null);
    setBusy(`Préparation 0/${slides.length}…`);
    try {
      const blobs = await prepare(slides, (n) => setBusy(`Préparation ${n}/${slides.length}…`));
      if (blobs.length === 1) saveBlob(blobs[0], slides[0].fileName);
      else saveBlob(await makeZip(blobs.map((b, i) => ({ name: slides[i].fileName, blob: b }))), `261wear-${slug(products.map((p) => p.name).join("-"))}-${format}.zip`);
      const copied = await copyText(caption);
      setNotice({ ok: true, text: `${blobs.length} photo${blobs.length > 1 ? "s" : ""} téléchargée${blobs.length > 1 ? "s" : ""}${copied ? ` · légende ${NETWORKS.find((n) => n.id === network)!.label} copiée` : ""}.` });
    } catch (err) {
      setNotice({ ok: false, text: `Échec : ${(err as Error).message}` });
    } finally {
      setBusy(null);
    }
  }

  async function shareAll() {
    setNotice(null);
    if (!ready || ready.sig !== sig) {
      // A photo failed to render: try again (failed photos are not kept in the cache).
      if (prepFailed?.sig === sig) {
        setPrepFailed(null);
        setAttempt((a) => a + 1);
      }
      return;
    }
    // Copy the caption (Instagram and TikTok drop text sent with photos), without
    // waiting: Safari only opens the share sheet straight from the tap.
    const copying = copyText(caption);
    try {
      await navigator.share({ files: ready.files });
      setNotice({ ok: true, text: (await copying) ? "Légende copiée : colle-la dans la publication." : "Photos partagées." });
    } catch (err) {
      if ((err as Error).name !== "AbortError") setNotice({ ok: false, text: `Partage impossible : ${(err as Error).message}` });
    }
  }

  async function downloadOne(s: Slide) {
    setNotice(null);
    try {
      saveBlob(await getJpeg(s.url), s.fileName);
    } catch (err) {
      setNotice({ ok: false, text: `Échec : ${(err as Error).message}` });
    }
  }

  const shareReady = ready?.sig === sig;
  const shareFailed = !shareReady && prepFailed?.sig === sig;
  const formatInfo = FORMATS.find((f) => f.id === format)!;

  return (
    <div className="grid gap-6 pb-28 lg:grid-cols-[1fr_400px] lg:pb-0">
      <div className="min-w-0 space-y-6">
        {/* 1. Pairs */}
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">1. Les paires à mettre en avant</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (modèle, réf.)"
              className="input max-w-64 py-2 text-sm"
              aria-label="Rechercher une paire"
              type="search"
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            {search.trim() ? "Résultats" : "Dernières paires en ligne, celles déjà à Tana d'abord"}
            {searching && " · recherche…"}
          </p>
          <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {results.map((p) => {
              const on = selected.some((s) => s.id === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProduct(p)}
                  aria-pressed={on}
                  className={`w-32 shrink-0 snap-start overflow-hidden rounded-xl border-2 text-left transition ${on ? "border-ink" : "border-black/10 hover:border-black/30"}`}
                >
                  <span className="relative block">
                    <Img src={thumbUrl(p.images[0])} fallback={p.images[0]} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                    {on && <span className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-accent">✓</span>}
                  </span>
                  <span className="block p-2">
                    <span className="line-clamp-2 text-xs leading-tight font-semibold">{p.name}</span>
                    <span className="mt-1 block text-xs text-muted">{formatAr(p.price)}</span>
                    <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[p.status]}`}>{productStatus(p.status).short}</span>
                  </span>
                </button>
              );
            })}
            {!results.length && !searching && <p className="py-6 text-sm text-muted">Aucune paire en ligne avec photo{search.trim() ? " pour cette recherche" : ""}.</p>}
          </div>

          {selected.length > 0 && (
            <div className="mt-4 space-y-3 border-t border-black/10 pt-4">
              <p className="text-xs text-muted">Touche les photos à inclure (dans l&apos;ordre du carrousel).</p>
              {selected.map((p) => (
                <div key={p.id} className="rounded-xl border border-black/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-xs text-muted">
                        {formatAr(p.price)} · {productStatus(p.status).short} · {shortLink(origin, p.id)}
                      </p>
                    </div>
                    <button type="button" onClick={() => toggleProduct(p)} className="shrink-0 rounded-full px-2 py-1 text-xs text-muted hover:bg-black/5 hover:text-ink" aria-label={`Retirer ${p.name}`}>
                      Retirer ✕
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.images.map((u, i) => {
                      const on = photos[p.id]?.includes(i);
                      return (
                        <button
                          key={u}
                          type="button"
                          onClick={() => togglePhoto(p, i)}
                          aria-pressed={on}
                          aria-label={on ? `Retirer la photo ${i + 1}` : `Ajouter la photo ${i + 1}`}
                          className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 transition ${on ? "border-ink" : "border-transparent opacity-50 hover:opacity-100"}`}
                        >
                          <Img src={thumbUrl(u)} fallback={u} alt="" loading="lazy" className="h-full w-full object-cover" />
                          {on && <span className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white bg-accent" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {tooMany && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Plus de {MAX_SLIDES} photos : seules les {MAX_SLIDES} premières sont gardées (maximum d&apos;un carrousel Instagram).</p>}
            </div>
          )}
        </section>

        {/* 2. Frame and format */}
        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">2. Cadre et format</h2>
          <fieldset>
            <legend className="label">Format</legend>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  aria-pressed={format === f.id}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition ${format === f.id ? "border-ink bg-ink text-white" : "border-black/10 hover:border-black/30"}`}
                >
                  <span className={`shrink-0 rounded-sm border-2 ${format === f.id ? "border-accent" : "border-current"} ${f.id === "4x5" ? "h-7 w-[22px]" : "h-8 w-[18px]"}`} aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold">{f.label}</span>
                    <span className={`block text-xs ${format === f.id ? "text-white/70" : "text-muted"}`}>{f.networks}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Cadre</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[{ id: "auto" as const, label: "Auto", use: "Néon si à Tana, Ticket sinon" }, ...FRAMES].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => pickFrame(f.id)}
                  aria-pressed={frame === f.id}
                  title={f.use}
                  className={`rounded-xl border-2 px-3 py-2 text-left transition ${frame === f.id ? "border-ink bg-ink text-white" : "border-black/10 hover:border-black/30"}`}
                >
                  <span className="block text-sm font-semibold">{f.label}</span>
                  <span className={`block text-[11px] leading-tight ${frame === f.id ? "text-white/70" : "text-muted"}`}>{f.use}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={fit === "contain"} onChange={(e) => setFit(e.target.checked ? "contain" : "cover")} className="h-4 w-4" />
              Photo entière (sans recadrage)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="h-4 w-4" />
              Afficher le prix
            </label>
          </div>
          {titled && (
            <div>
              <label className="label" htmlFor="studio-title">Grand titre (Pellicule, Polaroïd)</label>
              <input
                id="studio-title"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={defaultTitle(usedFrames.has("pellicule") ? "pellicule" : "polaroid")}
                className="input"
              />
              <p className="mt-1 text-xs text-muted">2 à 5 mots. Ex. : DROP DU VENDREDI, ILS L&apos;ONT REÇUE, SPÉCIAL FÊTES.</p>
            </div>
          )}
        </section>

        {/* 3. Preview */}
        <section className="card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">3. Aperçu</h2>
            <p className="text-xs text-muted">
              {slides.length} photo{slides.length > 1 ? "s" : ""} · {formatInfo.width}×{formatInfo.height} · JPEG
            </p>
          </div>
          {slides.length ? (
            <div className={`mt-4 grid gap-3 ${format === "4x5" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
              {slides.map((s, n) => (
                <figure key={s.key} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.url}
                    alt={`Photo ${n + 1} : ${s.product.name}`}
                    loading="lazy"
                    width={formatInfo.width}
                    height={formatInfo.height}
                    className={`w-full rounded-lg bg-ink object-cover ${format === "4x5" ? "aspect-[4/5]" : "aspect-[9/16]"}`}
                  />
                  <span className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-ink shadow">{n + 1}</span>
                  <button
                    type="button"
                    onClick={() => downloadOne(s)}
                    className="absolute right-2 bottom-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  >
                    Télécharger
                  </button>
                </figure>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-muted">Choisis une ou plusieurs paires au-dessus : les photos encadrées apparaissent ici.</p>
          )}
        </section>
      </div>

      {/* 4. Publish */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">4. Publier</h2>
          <div role="tablist" aria-label="Réseau" className="grid grid-cols-3 gap-1 rounded-full bg-black/5 p-1">
            {NETWORKS.map((n) => (
              <button
                key={n.id}
                role="tab"
                type="button"
                aria-selected={network === n.id}
                onClick={() => setNetwork(n.id)}
                className={`rounded-full px-2 py-1.5 text-sm font-semibold transition ${network === n.id ? "bg-ink text-white" : "text-ink/70 hover:text-ink"}`}
              >
                {n.label}
              </button>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="label" htmlFor="studio-caption">Légende {NETWORKS.find((n) => n.id === network)!.label}</label>
              {custom[network] !== undefined && (
                <button type="button" onClick={() => setCustom({ ...custom, [network]: undefined })} className="text-xs underline">Régénérer</button>
              )}
            </div>
            <textarea
              id="studio-caption"
              rows={9}
              className="input text-sm"
              value={caption}
              onChange={(e) => setCustom({ ...custom, [network]: e.target.value })}
              placeholder="Choisis des paires : la légende se remplit toute seule."
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted">{caption.length} caractères</span>
              <CopyButton text={caption} label="Copier la légende" className="btn-ghost py-2 text-sm" />
            </div>
          </div>
          <ul className="space-y-1.5 rounded-xl bg-paper p-3 text-xs text-ink/80">
            {NETWORK_TIPS[network].map((t) => (
              <li key={t} className="flex gap-2"><span className="text-ink/40">•</span><span>{t}</span></li>
            ))}
            {network === "instagram" && format === "9x16" && <li className="font-semibold text-amber-800">En 9:16, Instagram recadre le carrousel dans le fil : préfère le 4:5 pour un post.</li>}
            {network === "tiktok" && format === "4x5" && <li className="font-semibold text-amber-800">TikTok affiche le 4:5 avec des bandes : préfère le 9:16.</li>}
            {network === "facebook" && slides.length > 10 && <li className="font-semibold text-amber-800">Facebook : 10 photos maximum par publication.</li>}
          </ul>

          <div className="hidden space-y-2 lg:block">
            <Button type="button" onClick={downloadAll} pending={Boolean(busy)} pendingLabel={busy ?? undefined} disabled={!slides.length} className="btn-dark w-full py-4">
              {slides.length > 1 ? `Tout télécharger (${slides.length} photos, .zip)` : "Télécharger la photo"}
            </Button>
            <p className="text-center text-xs text-muted">La légende de l&apos;onglet choisi est copiée en même temps.</p>
          </div>
          {notice && (
            <p role="status" className={`hidden rounded-lg px-3 py-2 text-sm lg:block ${notice.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
              {notice.text}
            </p>
          )}
        </section>
      </aside>

      {/* Phones: one big button always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        {canShare ? (
          <Button type="button" onClick={shareAll} pending={Boolean(slides.length) && !shareReady && !shareFailed} pendingLabel="Préparation des photos…" disabled={!slides.length} className="btn-dark w-full py-4">
            {shareFailed ? "Réessayer la préparation" : `Enregistrer / partager ${slides.length > 1 ? `les ${slides.length} photos` : "la photo"}`}
          </Button>
        ) : (
          <Button type="button" onClick={downloadAll} pending={Boolean(busy)} pendingLabel={busy ?? undefined} disabled={!slides.length} className="btn-dark w-full py-4">
            {slides.length > 1 ? `Tout télécharger (${slides.length})` : "Télécharger"}
          </Button>
        )}
        {shareFailed ? (
          <p role="alert" className="mt-1 text-center text-xs text-red-700">Une photo n&apos;a pas pu être préparée : {prepFailed!.text}</p>
        ) : notice ? (
          <p role="status" className={`mt-1 text-center text-xs ${notice.ok ? "text-green-800" : "text-red-700"}`}>{notice.text}</p>
        ) : (
          <p className="mt-1 text-center text-[11px] text-muted">Légende {NETWORKS.find((n) => n.id === network)!.label} copiée en même temps</p>
        )}
      </div>
    </div>
  );
}
