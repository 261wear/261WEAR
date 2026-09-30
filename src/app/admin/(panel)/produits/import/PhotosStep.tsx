"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { attachProductImages, publishProducts } from "@/app/admin/actions";
import { uploadImage } from "@/components/admin/upload";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Spinner } from "@/components/ui/Spinner";
import { matchImage } from "@/lib/import";
import type { ProductSummary } from "./ImportWizard";

const MAX_PER_PRODUCT = 12;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Picked = { file: File; preview: string; order: number };
type Group = { product: ProductSummary; files: Picked[] };
type GroupState = "waiting" | "uploading" | "done" | "error";

export function PhotosStep({ products }: { products: ProductSummary[] }) {
  const [files, setFiles] = useState<File[]>([]);
  const [replace, setReplace] = useState(false);
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [states, setStates] = useState<Record<number, GroupState>>({});
  const [failures, setFailures] = useState<string[]>([]);
  const [finished, setFinished] = useState<number[] | null>(null);
  const [publishing, startPublish] = useTransition();
  const [published, setPublished] = useState(false);

  const refs = useMemo(() => products.map((p) => p.ref).filter((r): r is string => !!r), [products]);

  // One preview URL per selected image, freed when the selection changes.
  const previews = useMemo(
    () => files.filter((f) => ACCEPTED.includes(f.type)).map((file) => ({ file, preview: URL.createObjectURL(file) })),
    [files],
  );
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.preview)), [previews]);

  const { groups, unmatched, unsupported } = useMemo(() => {
    const byRef = new Map<string, Picked[]>();
    const unmatched: File[] = [];
    const unsupported = files.filter((f) => !ACCEPTED.includes(f.type));
    for (const { file, preview } of previews) {
      const m = matchImage(file.name, refs);
      if (!m.ref) {
        unmatched.push(file);
        continue;
      }
      const list = byRef.get(m.ref) ?? [];
      list.push({ file, preview, order: m.order });
      byRef.set(m.ref, list);
    }
    const groups: Group[] = [...byRef.entries()]
      .map(([ref, list]) => ({
        product: products.find((p) => p.ref === ref)!,
        files: list.sort((a, b) => a.order - b.order || a.file.name.localeCompare(b.file.name, undefined, { numeric: true })),
      }))
      .sort((a, b) => a.product.ref!.localeCompare(b.product.ref!, undefined, { numeric: true }));
    return { groups, unmatched, unsupported };
  }, [files, previews, refs, products]);

  const totalFiles = groups.reduce((n, g) => n + Math.min(g.files.length, MAX_PER_PRODUCT), 0);

  function pick(list: FileList | null) {
    if (!list?.length) return;
    setFinished(null);
    setPublished(false);
    setFailures([]);
    setStates({});
    setFiles(Array.from(list));
  }

  function run() {
    setFailures([]);
    setProgress({ done: 0, total: totalFiles });
    startTransition(async () => {
      let done = 0;
      const ok: number[] = [];
      const failed: string[] = [];
      for (const g of groups) {
        setStates((s) => ({ ...s, [g.product.id]: "uploading" }));
        const urls: string[] = [];
        for (const f of g.files.slice(0, MAX_PER_PRODUCT)) {
          try {
            urls.push(await uploadImage(f.file, "products"));
          } catch (err) {
            failed.push(`${f.file.name} : ${(err as Error).message}`);
          }
          done++;
          setProgress({ done, total: totalFiles });
        }
        try {
          if (!urls.length) throw new Error("no upload");
          await attachProductImages(g.product.id, urls, replace);
          ok.push(g.product.id);
          setStates((s) => ({ ...s, [g.product.id]: urls.length === Math.min(g.files.length, MAX_PER_PRODUCT) ? "done" : "error" }));
        } catch {
          if (urls.length) failed.push(`${g.product.ref} : enregistrement impossible`);
          setStates((s) => ({ ...s, [g.product.id]: "error" }));
        }
      }
      setFailures(failed);
      setFinished(ok);
      setProgress(null);
    });
  }

  const hiddenDone = (finished ?? []).filter((id) => !products.find((p) => p.id === id)?.active);

  if (!refs.length) {
    return <p className="card p-6 text-sm">Aucun produit n&apos;a de référence. Commence par l&apos;étape 1 (ou ajoute une référence dans les fiches produits).</p>;
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 text-sm">
        <h2 className="text-base font-semibold">Nomme tes photos avec la référence du produit</h2>
        <div className="mt-3 grid gap-2 font-mono text-xs sm:grid-cols-4">
          {["AR261.jpg", "AR261-2.jpg", "AR261_3.png", "AR261 (4).jpg"].map((n) => (
            <span key={n} className="rounded-lg bg-paper px-3 py-2">{n}</span>
          ))}
        </div>
        <p className="mt-3 text-black/70">
          → toutes rangées dans le produit <b>AR261</b>, dans l&apos;ordre du numéro (la photo sans numéro ou n°1 devient la photo principale).
          {" "}{MAX_PER_PRODUCT} photos max par produit. Tu peux sélectionner un dossier entier.
        </p>
      </div>

      <div
        className="card flex flex-col items-center gap-3 border-2 border-dashed border-black/20 p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!pending) pick(e.dataTransfer.files);
        }}
      >
        <p className="font-semibold">Glisse tes photos ici</p>
        <div className="flex flex-wrap justify-center gap-2">
          <label className={`btn-dark ${pending ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
            Choisir des photos
            <input type="file" accept="image/*" multiple className="sr-only" disabled={pending} onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
          </label>
          <label className={`btn-ghost ${pending ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
            Choisir un dossier
            <input
              type="file"
              multiple
              className="sr-only"
              disabled={pending}
              ref={(el) => { el?.setAttribute("webkitdirectory", ""); }}
              onChange={(e) => { pick(e.target.files); e.target.value = ""; }}
            />
          </label>
        </div>
        {files.length > 0 && <p className="text-xs text-muted">{files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""}</p>}
      </div>

      {(unmatched.length > 0 || unsupported.length > 0) && (
        <div className="card border-amber-200 bg-amber-50 p-5 text-sm">
          {unmatched.length > 0 && (
            <>
              <p className="font-semibold text-amber-900">{unmatched.length} photo{unmatched.length > 1 ? "s" : ""} sans produit correspondant (ignorée{unmatched.length > 1 ? "s" : ""}) :</p>
              <p className="mt-1 font-mono text-xs break-all text-amber-900">{unmatched.slice(0, 30).map((f) => f.name).join(", ")}{unmatched.length > 30 ? "…" : ""}</p>
              <p className="mt-1 text-xs text-amber-800">Le nom doit commencer par une référence existante.</p>
            </>
          )}
          {unsupported.length > 0 && (
            <p className="mt-2 text-amber-900">
              {unsupported.length} fichier{unsupported.length > 1 ? "s" : ""} au format non pris en charge (JPG, PNG, WEBP uniquement — les photos iPhone HEIC doivent être converties) :{" "}
              <span className="font-mono text-xs">{unsupported.slice(0, 10).map((f) => f.name).join(", ")}</span>
            </p>
          )}
        </div>
      )}

      {groups.length > 0 && (
        <div className="card divide-y divide-black/5">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <b>{totalFiles} photo{totalFiles > 1 ? "s" : ""} pour {groups.length} produit{groups.length > 1 ? "s" : ""}</b>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} disabled={pending} className="h-4 w-4" />
              Remplacer les photos existantes <span className="text-muted">(sinon ajoutées à la suite)</span>
            </label>
          </div>
          {groups.map((g) => (
            <GroupRow key={g.product.id} group={g} state={states[g.product.id]} replace={replace} />
          ))}
        </div>
      )}

      {groups.length > 0 && !finished && (
        <div className="flex flex-wrap items-center justify-end gap-4">
          {progress && (
            <div className="min-w-48 flex-1" aria-hidden="true">
              <div className="h-2 overflow-hidden rounded-full bg-black/10">
                <div className="h-full bg-ink transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}
          <Button type="button" onClick={run} pending={pending} pendingLabel={progress ? `Envoi ${Math.min(progress.done + 1, progress.total)}/${progress.total}…` : "Envoi…"}>
            Envoyer {totalFiles} photo{totalFiles > 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {failures.length > 0 && <FormMessage error={`Certaines photos n'ont pas pu être envoyées : ${failures.join(" · ")}`} />}

      {finished && (
        <div role="status" className="card space-y-3 border-green-200 bg-green-50 p-5">
          <p className="font-semibold text-green-900">Photos ajoutées à {finished.length} produit{finished.length > 1 ? "s" : ""}.</p>
          {hiddenDone.length > 0 && !published && (
            <Button type="button" pending={publishing} pendingLabel="Mise en ligne…" onClick={() => startPublish(async () => { await publishProducts(hiddenDone); setPublished(true); })}>
              Mettre en ligne ces {hiddenDone.length} produit{hiddenDone.length > 1 ? "s" : ""}
            </Button>
          )}
          {published && <p className="text-sm text-green-900">Produits en ligne sur le site ✓</p>}
          <Link href="/admin/produits" className="block text-sm underline">Voir la liste des produits</Link>
        </div>
      )}
    </div>
  );
}

function GroupRow({ group, state, replace }: { group: Group; state?: GroupState; replace: boolean }) {
  const { product, files } = group;
  const extra = files.length - MAX_PER_PRODUCT;
  return (
    <div className="flex flex-wrap items-center gap-4 p-4">
      <div className="w-48 min-w-0">
        <p className="font-mono text-xs font-semibold">{product.ref}</p>
        <p className="truncate text-sm">{product.name}</p>
        <p className="text-xs text-muted">
          {product.images} photo{product.images > 1 ? "s" : ""} actuelle{product.images > 1 ? "s" : ""}
          {product.images > 0 && (replace ? " · remplacées" : " · conservées")}
        </p>
      </div>
      <div className="flex flex-1 flex-wrap gap-2">
        {files.slice(0, MAX_PER_PRODUCT).map((f, i) => (
          <div key={f.preview} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.preview} alt={f.file.name} title={f.file.name} className="h-16 w-16 rounded-lg border border-black/10 object-cover" />
            {i === 0 && !(product.images && !replace) && (
              <span className="absolute bottom-0.5 left-0.5 rounded bg-ink px-1 text-[10px] font-semibold text-white">Principale</span>
            )}
          </div>
        ))}
        {extra > 0 && <p className="self-center text-xs text-red-700">+{extra} ignorée{extra > 1 ? "s" : ""} (max {MAX_PER_PRODUCT})</p>}
      </div>
      <div className="w-28 text-right text-xs font-semibold" aria-live="polite">
        {state === "uploading" && <span className="inline-flex items-center gap-1.5 text-black/60"><Spinner /> Envoi…</span>}
        {state === "done" && <span className="text-green-700">✓ Ajoutées</span>}
        {state === "error" && <span className="text-red-700">⚠ Incomplet</span>}
        {!state && <span className="text-muted">{files.length > MAX_PER_PRODUCT ? MAX_PER_PRODUCT : files.length} à envoyer</span>}
      </div>
    </div>
  );
}
