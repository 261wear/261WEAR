"use client";

import { useMemo, useState, useTransition } from "react";
import { publishToFacebook, type PublishResult } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Img } from "@/components/ui/Img";
import { formatAr } from "@/lib/pricing";

type P = { id: number; ref: string | null; name: string; category: string; price: number; sizes: string[]; images: string[]; active: boolean; inStock: boolean };

function sizeRange(sizes: string[]) {
  const nums = sizes.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (nums.length === sizes.length && nums.length > 2) return `${nums[0]} à ${nums[nums.length - 1]}`;
  return sizes.join(" · ");
}

function caption(products: P[], origin: string, delivery: string, stockDelivery: string) {
  const tags = "#261WEAR #Sneakers #Tana #Madagascar #Antananarivo";
  const allInStock = products.every((p) => p.inStock);
  const footer = [
    allInStock ? `⚡ Disponible de suite — livrée à Tana en ${stockDelivery}` : `📦 Sur commande — livrée à Tana en ${delivery}`,
    "✅ Photo de contrôle qualité de ta paire avant l'envoi",
  ];
  if (products.length === 1) {
    const p = products[0];
    return [
      `🔥 ${p.name.toUpperCase()}`,
      `💰 ${formatAr(p.price)}`,
      ...(p.sizes.length ? [`📏 Pointures : ${sizeRange(p.sizes)}`] : []),
      ...footer,
      "",
      `👉 Commande ici : ${origin}/produit/${p.id}`,
      "💬 Ou écris-nous sur WhatsApp",
      "",
      tags,
    ].join("\n");
  }
  return [
    "🔥 NOUVEAU DROP 261 WEAR 🔥",
    "",
    ...products.flatMap((p) => [
      `👟 ${p.name} — ${formatAr(p.price)}${p.sizes.length ? ` (${sizeRange(p.sizes)})` : ""}${p.inStock && !allInStock ? " ⚡ dispo de suite" : ""}`,
      `👉 ${origin}/produit/${p.id}`,
    ]),
    "",
    ...footer,
    "💬 Commande sur le site ou sur WhatsApp",
    "",
    tags,
  ].join("\n");
}

export function Composer({
  products,
  preselected,
  canPublish,
  maxPhotos,
  origin,
  deliveryText,
  stockDeliveryText,
}: {
  products: P[];
  preselected: number[];
  canPublish: boolean;
  maxPhotos: number;
  origin: string;
  deliveryText: string;
  stockDeliveryText: string;
}) {
  const initial = preselected.filter((id) => products.some((p) => p.id === id));
  const [selected, setSelected] = useState<number[]>(initial);
  const [photos, setPhotos] = useState<string[]>(() => {
    const out: string[] = [];
    for (const id of initial) for (const u of products.find((p) => p.id === id)!.images) if (out.length < maxPhotos) out.push(u);
    return out;
  });
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState<string | null>(null);
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PublishResult | null>(null);

  const chosen = selected.map((id) => products.find((p) => p.id === id)!).filter(Boolean);
  const generated = chosen.length ? caption(chosen, origin, deliveryText, stockDeliveryText) : "";
  const message = custom ?? generated;
  const hidden = chosen.filter((p) => !p.active);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => `${p.name} ${p.ref ?? ""} ${p.category}`.toLowerCase().includes(q)) : products;
  }, [products, search]);

  function toggleProduct(p: P) {
    setResult(null);
    if (selected.includes(p.id)) {
      setSelected(selected.filter((id) => id !== p.id));
      setPhotos(photos.filter((u) => !p.images.includes(u)));
    } else {
      setSelected([...selected, p.id]);
      // Add its photos up to the limit (at least the main one if there is room).
      const room = maxPhotos - photos.length;
      setPhotos([...photos, ...p.images.slice(0, Math.max(0, room))]);
    }
  }

  function togglePhoto(url: string) {
    setResult(null);
    if (photos.includes(url)) setPhotos(photos.filter((u) => u !== url));
    else if (photos.length < maxPhotos) setPhotos([...photos, url]);
  }

  function publish() {
    setResult(null);
    startTransition(async () => {
      const res = await publishToFacebook({
        productIds: selected,
        images: photos,
        message,
        scheduledAt: schedule && when ? new Date(when).toISOString() : null,
      });
      setResult(res);
      if (res.ok) {
        setSelected([]);
        setPhotos([]);
        setCustom(null);
        setSchedule(false);
        setWhen("");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">1. Produits et photos</h2>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, réf.)" className="input max-w-60 py-2 text-sm" aria-label="Rechercher un produit" />
        </div>
        <p className="mt-1 text-xs text-muted">{photos.length}/{maxPhotos} photos sélectionnées · clique sur une photo pour l&apos;ajouter ou la retirer</p>
        <div className="mt-4 space-y-3">
          {visible.map((p) => {
            const on = selected.includes(p.id);
            return (
              <div key={p.id} className={`rounded-xl border p-3 transition ${on ? "border-ink bg-paper/60" : "border-black/10"}`}>
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={on} onChange={() => toggleProduct(p)} className="h-4 w-4" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="text-xs text-muted">
                      {[p.ref, formatAr(p.price), `${p.images.length} photo${p.images.length > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}
                      {!p.active && <span className="ml-1 font-semibold text-amber-700">· non commandable</span>}
                    </span>
                  </span>
                </label>
                {on && (
                  <div className="mt-3 flex flex-wrap gap-2 pl-7">
                    {p.images.map((u) => {
                      const idx = photos.indexOf(u);
                      return (
                        <button
                          key={u}
                          type="button"
                          onClick={() => togglePhoto(u)}
                          aria-pressed={idx >= 0}
                          aria-label={idx >= 0 ? `Retirer la photo (n°${idx + 1})` : "Ajouter la photo"}
                          disabled={idx < 0 && photos.length >= maxPhotos}
                          className={`relative h-20 w-20 overflow-hidden rounded-lg border-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${idx >= 0 ? "border-[#1877F2]" : "border-transparent opacity-60 hover:opacity-100"}`}
                        >
                          <Img src={u} alt="" className="h-full w-full object-cover" />
                          {idx >= 0 && (
                            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-[11px] font-bold text-white">{idx + 1}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {!visible.length && <p className="text-sm text-muted">Aucun produit avec photo{search ? " pour cette recherche" : ""}.</p>}
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="card space-y-4 p-5">
          <h2 className="font-semibold">2. Texte et publication</h2>
          <div>
            <div className="flex items-center justify-between">
              <label className="label" htmlFor="fb-message">Texte</label>
              {custom !== null && (
                <button type="button" onClick={() => setCustom(null)} className="text-xs underline">Régénérer</button>
              )}
            </div>
            <textarea
              id="fb-message"
              rows={10}
              className="input text-sm"
              value={message}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Sélectionne des produits : le texte se remplit automatiquement."
            />
          </div>
          {hidden.length > 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              ⚠ {hidden.map((p) => p.name).join(", ")} {hidden.length > 1 ? "ne sont pas commandables" : "n'est pas commandable"} sur le site (brouillon ou épuisé) : les clients ne pourront pas commander via le lien.
            </p>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} className="h-4 w-4" />
            Programmer (ex. drop du vendredi 19h)
          </label>
          {schedule && (
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="input" aria-label="Date et heure de publication" />
          )}
          <FormMessage error={result?.error} ok={result?.ok} />
          {result?.url && (
            <a href={result.url} target="_blank" rel="noopener" className="block text-sm underline">Voir la publication sur Facebook ↗</a>
          )}
          <Button
            type="button"
            onClick={publish}
            pending={pending}
            pendingLabel={`Envoi de ${photos.length} photo${photos.length > 1 ? "s" : ""} à Facebook…`}
            disabled={!canPublish || !photos.length || !message.trim() || (schedule && !when)}
            className="btn w-full bg-[#1877F2] py-4 text-white hover:brightness-95"
          >
            {schedule ? "Programmer sur Facebook" : "Publier sur Facebook"}
          </Button>
          {!canPublish && (
            <div className="space-y-2 border-t border-black/10 pt-4">
              <p className="text-xs text-muted">Publication manuelle en attendant la connexion :</p>
              <CopyButton text={message} label="Copier le texte" className="btn-ghost w-full" />
              <div className="flex flex-wrap gap-2">
                {photos.map((u, i) => (
                  <a key={u} href={u} download target="_blank" rel="noopener" className="text-xs underline">Photo {i + 1}</a>
                ))}
              </div>
            </div>
          )}
        </div>

        {photos.length > 0 && (
          <div className="card overflow-hidden" aria-label="Aperçu de la publication">
            <div className="flex items-center gap-2 p-3">
              <span className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs text-white">261</span>
              <div className="text-sm leading-tight">
                <p className="font-semibold">261 WEAR</p>
                <p className="text-xs text-muted">{schedule && when ? new Date(when).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "À l'instant"} · 🌍</p>
              </div>
            </div>
            <p className="line-clamp-6 px-3 pb-3 text-sm whitespace-pre-line">{message}</p>
            <PhotoGrid photos={photos} />
          </div>
        )}
      </div>
    </div>
  );
}

// Facebook-like layout: 1 big, 2 side by side, 3+ = 1 big + up to 3 small.
function PhotoGrid({ photos }: { photos: string[] }) {
  if (photos.length === 1) return <Img src={photos[0]} alt="" className="aspect-square w-full object-cover" />;
  if (photos.length === 2)
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {photos.map((u) => <Img key={u} src={u} alt="" className="aspect-square w-full object-cover" />)}
      </div>
    );
  const rest = photos.slice(1, 4);
  const more = photos.length - 4;
  return (
    <div className="grid gap-0.5">
      <Img src={photos[0]} alt="" className="aspect-[4/3] w-full object-cover" />
      <div className={`grid gap-0.5 ${rest.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {rest.map((u, i) => (
          <div key={u} className="relative">
            <Img src={u} alt="" className="aspect-square w-full object-cover" />
            {i === rest.length - 1 && more > 0 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-semibold text-white">+{more}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
