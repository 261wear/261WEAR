"use client";

import { useState, useTransition } from "react";
import { importProducts, type ImportResult } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { resolveRow, rowsFromText, TEMPLATE_EXAMPLE, TEMPLATE_HEADERS, type ImportRow, type ResolvedRow } from "@/lib/import";
import { computePrice, formatAr, type PricingSettings } from "@/lib/pricing";
import { priceIssues, productWarnings } from "@/lib/product-rules";
import { PRODUCT_STATUSES, productStatus, STATUS_BADGE, type ProductStatus } from "@/lib/product-status";
import type { ProductSummary } from "./ImportWizard";

const CHUNK = 50;
// A catalogue of thousands of lines: the preview shows the lines in error first,
// then the first ones, so the page stays fast. Every valid line is imported.
const PREVIEW_ROWS = 200;

function downloadTemplate() {
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLE].map((r) => r.map(esc).join(";")).join("\r\n");
  // BOM so Excel opens accents correctly; ";" is the French Excel separator.
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "261wear-modele-import.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ProductSheetsStep({
  settings,
  products,
  onDone,
}: {
  settings: PricingSettings;
  products: ProductSummary[];
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [defaultStatus, setDefaultStatus] = useState<ProductStatus>("brouillon");
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const { rows, missingColumns, ignored } = rowsFromText(text);
  const byRef = new Map(products.filter((p) => p.ref).map((p) => [p.ref!, p]));
  // Same merge + rules as the server: what you see is what will be saved.
  const resolved = rows.map((r) => {
    const res = resolveRow(r, byRef.get(r.ref), defaultStatus);
    return { row: r, ...res, errors: res.errors.length ? res.errors : priceIssues(res.product, settings) };
  });
  const valid = resolved.filter((r) => !r.errors.length).map((r) => r.row);
  const invalid = rows.length - valid.length;
  const toUpdate = resolved.filter((r) => !r.errors.length && !r.isNew).length;
  const preview = [...resolved.filter((r) => r.errors.length), ...resolved.filter((r) => !r.errors.length)].slice(0, PREVIEW_ROWS);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    setText(await file.text());
  }

  function runImport() {
    setError("");
    setResult(null);
    setProgress({ done: 0, total: valid.length });
    startTransition(async () => {
      const total: ImportResult = { created: 0, updated: 0, suppliersCreated: [], skipped: [] };
      try {
        for (let i = 0; i < valid.length; i += CHUNK) {
          const r = await importProducts(valid.slice(i, i + CHUNK), defaultStatus);
          total.created += r.created;
          total.updated += r.updated;
          total.skipped.push(...r.skipped);
          total.suppliersCreated.push(...r.suppliersCreated);
          setProgress({ done: Math.min(i + CHUNK, valid.length), total: valid.length });
        }
        setResult(total);
        setText("");
        setFileName("");
      } catch {
        setError("L'import a été interrompu (connexion ?). Les fiches déjà importées sont enregistrées : relance l'import, elles seront mises à jour sans doublon.");
      } finally {
        setProgress(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="card grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-start">
        <div className="text-sm">
          <h2 className="text-base font-semibold">1. Prépare ton fichier</h2>
          <p className="mt-1 text-black/70">
            <b>Nouveau produit</b> : <b>ref</b>, <b>nom</b>, puis selon le cas :
          </p>
          <ul className="mt-1 list-disc pl-5 text-black/70">
            <li><b>Sur commande</b> (import Chine) : <b>prix_rmb</b> et <b>poids_kg</b> obligatoires.</li>
            <li><b>Disponible de suite</b> (déjà à Tana) : <b>prix_achat_ar</b> seulement. Pas de poids, aucun frais ajouté : prix = achat + ta marge.</li>
          </ul>
          <p className="mt-1 text-black/70">
            Facultatives : statut, categorie, description, marge (vide = paramètres), prix_force, pointures (ex. « 39 40 41 42 »),
            fournisseur, ref_fournisseur, photos (liens https séparés par des espaces, 12 max). Un fournisseur inconnu est créé
            automatiquement.
          </p>
          <p className="mt-1 text-black/70">
            <b>Produit existant</b> (même ref) : la fiche est <b>mise à jour</b>, sans doublon ; une cellule vide garde la valeur
            actuelle. Ses photos sont conservées : la colonne photos ne remplace que des liens, jamais les photos que tu as envoyées. Un fichier « ref ; statut » suffit pour changer la disponibilité de tout le catalogue.
          </p>
        </div>
        <button type="button" onClick={downloadTemplate} className="btn-ghost whitespace-nowrap">↓ Télécharger le modèle</button>
      </div>

      <div className="card space-y-4 p-5">
        <h2 className="font-semibold">2. Charge le fichier ou colle les lignes</h2>
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-black/20 p-6 text-center text-sm hover:border-black"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files[0]);
          }}
        >
          <span className="font-semibold">{fileName || "Choisir un fichier CSV"}</span>
          <span className="text-xs text-muted">ou glisser-déposer ici · Excel : Fichier → Enregistrer sous → CSV</span>
          <input type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setFileName(""); setResult(null); }}
          rows={5}
          className="input font-mono text-xs"
          placeholder={"…ou copie les cellules depuis Excel / Google Sheets (avec la ligne d'en-tête) et colle-les ici\n\nref\tnom\tprix_rmb\tpointures\nAR261\tAir Runner 261 Black\t150\t39 40 41 42"}
          aria-label="Coller les lignes du tableau"
        />
      </div>

      {text.trim() && !missingColumns.length && !rows.length && (
        <FormMessage error="Aucune ligne de produit trouvée : il faut la ligne d'en-tête puis au moins une ligne (voir le modèle)." />
      )}
      {ignored > 0 && (
        <FormMessage error={`Fichier trop long : seules les ${rows.length} premières lignes sont prises en compte, ${ignored} ligne${ignored > 1 ? "s" : ""} ignorée${ignored > 1 ? "s" : ""}. Importe le reste dans un second fichier.`} />
      )}
      {missingColumns.length > 0 && <FormMessage error={`Colonnes introuvables : ${missingColumns.join(", ")}. Vérifie la ligne d'en-tête (voir le modèle).`} />}

      {rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-black/10 p-4 text-sm">
            <b>{rows.length} ligne{rows.length > 1 ? "s" : ""}</b>
            <span className="text-green-700">{valid.length - toUpdate} nouvelle{valid.length - toUpdate > 1 ? "s" : ""}</span>
            <span className="text-sky-700">{toUpdate} mise{toUpdate > 1 ? "s" : ""} à jour</span>
            {invalid > 0 && <span className="font-semibold text-red-700">{invalid} en erreur (ignorée{invalid > 1 ? "s" : ""})</span>}
            {rows.length > PREVIEW_ROWS && <span className="text-muted">Aperçu : {PREVIEW_ROWS} lignes{invalid ? ", erreurs en premier" : ""}</span>}
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs text-muted uppercase shadow-[0_1px_0_rgba(0,0,0,0.08)]">
                <tr>
                  <th className="p-2.5">Ligne</th>
                  <th className="p-2.5">Réf.</th>
                  <th className="p-2.5">Nom</th>
                  <th className="p-2.5">Base de prix</th>
                  <th className="p-2.5">Prix de vente</th>
                  <th className="p-2.5">Pointures</th>
                  <th className="p-2.5">Fournisseur</th>
                  <th className="p-2.5">Dispo</th>
                  <th className="p-2.5">Statut</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <PreviewRow key={r.row.line} row={r.row} resolved={r} settings={settings} existing={byRef.get(r.row.ref)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            Statut des nouveaux produits
            <select value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value as ProductStatus)} className="input w-auto py-2">
              {PRODUCT_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <span className="text-xs text-muted">(si la colonne « statut » est vide · conseillé : brouillon, puis publier après les photos)</span>
          </label>
          <Button
            type="button"
            onClick={runImport}
            disabled={!valid.length}
            pending={pending}
            pendingLabel={progress ? `Import ${progress.done}/${progress.total}…` : "Import…"}
          >
            Importer {valid.length} fiche{valid.length > 1 ? "s" : ""}
          </Button>
        </div>
      )}

      <FormMessage error={error} />
      {result && (
        <div role="status" className="card space-y-3 border-green-200 bg-green-50 p-5">
          <p className="font-semibold text-green-900">
            Import terminé : {result.created} fiche{result.created > 1 ? "s" : ""} créée{result.created > 1 ? "s" : ""}, {result.updated} mise{result.updated > 1 ? "s" : ""} à jour
            {result.skipped.length > 0 && `, ${result.skipped.length} ignorée${result.skipped.length > 1 ? "s" : ""}`}.
          </p>
          {result.suppliersCreated.length > 0 && (
            <p className="text-sm text-green-900">
              Nouveaux fournisseurs créés : {result.suppliersCreated.join(", ")} — complète leurs coordonnées dans « Fournisseurs ».
            </p>
          )}
          {result.skipped.map((s) => (
            <p key={s.line} className="text-sm text-red-700">Ligne {s.line} ({s.ref || "sans réf."}) : {s.errors.join(", ")}</p>
          ))}
          <button type="button" onClick={onDone} className="btn-dark">Étape 2 : ajouter les photos →</button>
        </div>
      )}
    </div>
  );
}

function PreviewRow({
  row,
  resolved,
  settings,
  existing,
}: {
  row: ImportRow;
  resolved: ResolvedRow;
  settings: PricingSettings;
  existing?: ProductSummary;
}) {
  const ok = !resolved.errors.length;
  const p = resolved.product;
  const pricing = ok ? computePrice(settings, p) : null;
  const warnings = ok ? productWarnings(p, settings) : [];
  const changes: string[] = [];
  if (existing && pricing) {
    if (p.name !== existing.name) changes.push("nom");
    if (p.status !== existing.status) changes.push(`${productStatus(existing.status).short} → ${productStatus(p.status).short}`);
    if (p.price_rmb !== existing.price_rmb) changes.push(`RMB ${existing.price_rmb ?? "—"} → ${p.price_rmb ?? "—"} ¥`);
    if (p.cost_ar !== existing.cost_ar) changes.push(`achat ${existing.cost_ar != null ? formatAr(existing.cost_ar) : "—"} → ${p.cost_ar != null ? formatAr(p.cost_ar) : "—"}`);
    if (pricing.price !== existing.price) changes.push(`prix de vente ${formatAr(existing.price)} → ${formatAr(pricing.price)}`);
    if (p.sizes.join(" ") !== existing.sizes.join(" ")) changes.push("pointures");
    if (p.category !== existing.category || p.description !== existing.description) changes.push("infos");
    if (row.images.length) changes.push("liens photos");
  }
  return (
    <tr className={`border-b border-black/5 align-top last:border-0 ${ok ? "" : "bg-red-50/60"}`}>
      <td className="p-2.5 text-muted">{row.line}</td>
      <td className="p-2.5 font-mono text-xs font-semibold">{row.ref || "—"}</td>
      <td className="p-2.5">
        {p.name || "—"}
        {p.category && <span className="block text-xs text-muted">{p.category}</span>}
        {row.images.length > 0 && <span className="block text-xs text-muted">{row.images.length} photo{row.images.length > 1 ? "s" : ""} en lien</span>}
      </td>
      <td className="p-2.5 text-xs whitespace-nowrap">
        {pricing ? (pricing.basis === "ar" ? `Achat ${formatAr(p.cost_ar!)}` : `${p.price_rmb} ¥ + transport`) : "—"}
      </td>
      <td className="p-2.5 font-semibold whitespace-nowrap">
        {pricing ? formatAr(pricing.price) : "—"}
        {warnings.map((w) => <span key={w} className="mt-1 block text-xs font-normal text-amber-700">⚠ {w}</span>)}
      </td>
      <td className="p-2.5 text-xs">{p.sizes.join(" ") || "—"}</td>
      <td className="p-2.5 text-xs">
        {row.supplier || "—"}
        {row.supplier_ref && <span className="block font-mono text-muted">{row.supplier_ref}</span>}
      </td>
      <td className="p-2.5 text-xs">
        <span className={`inline-block rounded-full px-2 py-0.5 font-semibold whitespace-nowrap ${STATUS_BADGE[p.status]}`}>{productStatus(p.status).short}</span>
      </td>
      <td className="p-2.5 text-xs">
        {ok ? (
          existing ? (
            <span>
              <span className="inline-flex items-center gap-1 rounded-md bg-sky-700 px-2 py-0.5 font-bold whitespace-nowrap text-white">↻ Mise à jour</span>
              <span className="mt-1 block text-sky-800">{changes.length ? changes.join(" · ") : "infos inchangées"}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-0.5 font-bold whitespace-nowrap text-white">✦ Nouveau</span>
          )
        ) : (
          <span className="text-red-700">{resolved.errors.join(" · ")}</span>
        )}
      </td>
    </tr>
  );
}
