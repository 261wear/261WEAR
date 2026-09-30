"use client";

import { useState, useTransition } from "react";
import { importProducts, type ImportResult } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { rowsFromText, TEMPLATE_EXAMPLE, TEMPLATE_HEADERS, type ImportRow } from "@/lib/import";
import { computePrice, formatAr, type PricingSettings } from "@/lib/pricing";
import type { ProductSummary } from "./ImportWizard";

const CHUNK = 50;

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
  const [publish, setPublish] = useState(false);
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const { rows, missingColumns } = rowsFromText(text);
  const existingRefs = new Set(products.map((p) => p.ref).filter(Boolean));
  const valid = rows.filter((r) => !r.errors.length);
  const invalid = rows.length - valid.length;
  const toUpdate = valid.filter((r) => existingRefs.has(r.ref)).length;

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
      const total: ImportResult = { created: 0, updated: 0, skipped: [] };
      try {
        for (let i = 0; i < valid.length; i += CHUNK) {
          const r = await importProducts(valid.slice(i, i + CHUNK), publish);
          total.created += r.created;
          total.updated += r.updated;
          total.skipped.push(...r.skipped);
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
            Colonnes obligatoires : <b>ref</b>, <b>nom</b>, <b>prix_rmb</b>. Facultatives : categorie, description, poids_kg, marge,
            prix_force, pointures (ex. « 39 40 41 42 »). Vide = valeur par défaut des paramètres.
          </p>
          <p className="mt-1 text-black/70">
            La <b>ref</b> sert à retrouver le produit : réimporter une ref existante <b>met à jour</b> la fiche (photos conservées), sans doublon.
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

      {missingColumns.length > 0 && <FormMessage error={`Colonnes introuvables : ${missingColumns.join(", ")}. Vérifie la ligne d'en-tête (voir le modèle).`} />}

      {rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-black/10 p-4 text-sm">
            <b>{rows.length} ligne{rows.length > 1 ? "s" : ""}</b>
            <span className="text-green-700">{valid.length - toUpdate} nouvelle{valid.length - toUpdate > 1 ? "s" : ""}</span>
            <span className="text-sky-700">{toUpdate} mise{toUpdate > 1 ? "s" : ""} à jour</span>
            {invalid > 0 && <span className="font-semibold text-red-700">{invalid} en erreur (ignorée{invalid > 1 ? "s" : ""})</span>}
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs text-muted uppercase shadow-[0_1px_0_rgba(0,0,0,0.08)]">
                <tr>
                  <th className="p-2.5">Ligne</th>
                  <th className="p-2.5">Réf.</th>
                  <th className="p-2.5">Nom</th>
                  <th className="p-2.5">Prix RMB</th>
                  <th className="p-2.5">Prix de vente</th>
                  <th className="p-2.5">Pointures</th>
                  <th className="p-2.5">Statut</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <PreviewRow key={r.line} row={r} settings={settings} exists={existingRefs.has(r.ref)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="h-4 w-4" />
            Mettre en ligne tout de suite <span className="text-muted">(conseillé : après avoir ajouté les photos)</span>
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
          {result.skipped.map((s) => (
            <p key={s.line} className="text-sm text-red-700">Ligne {s.line} ({s.ref || "sans réf."}) : {s.errors.join(", ")}</p>
          ))}
          <button type="button" onClick={onDone} className="btn-dark">Étape 2 : ajouter les photos →</button>
        </div>
      )}
    </div>
  );
}

function PreviewRow({ row, settings, exists }: { row: ImportRow; settings: PricingSettings; exists: boolean }) {
  const ok = !row.errors.length;
  const price = ok ? computePrice(settings, { price_rmb: row.price_rmb!, weight_kg: row.weight_kg, margin_pct: row.margin_pct, price_override: row.price_override }).price : null;
  return (
    <tr className={`border-b border-black/5 align-top last:border-0 ${ok ? "" : "bg-red-50/60"}`}>
      <td className="p-2.5 text-muted">{row.line}</td>
      <td className="p-2.5 font-mono text-xs font-semibold">{row.ref || "—"}</td>
      <td className="p-2.5">
        {row.name || "—"}
        {row.category && <span className="block text-xs text-muted">{row.category}</span>}
      </td>
      <td className="p-2.5">{row.price_rmb != null && !Number.isNaN(row.price_rmb) ? `${row.price_rmb} ¥` : "—"}</td>
      <td className="p-2.5 font-semibold">{price != null ? formatAr(price) : "—"}</td>
      <td className="p-2.5 text-xs">{row.sizes.join(" ") || "—"}</td>
      <td className="p-2.5 text-xs">
        {ok ? (
          <span className={`rounded-full px-2 py-0.5 font-semibold ${exists ? "bg-sky-100 text-sky-800" : "bg-green-100 text-green-800"}`}>
            {exists ? "Mise à jour" : "Nouveau"}
          </span>
        ) : (
          <span className="text-red-700">{row.errors.join(" · ")}</span>
        )}
      </td>
    </tr>
  );
}
