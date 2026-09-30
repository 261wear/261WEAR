import Link from "next/link";
import { listProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { ImportWizard } from "./ImportWizard";

export default async function ImportPage(props: PageProps<"/admin/produits/import">) {
  const [products, settings, { etape }] = await Promise.all([
    listProducts({ onlyActive: false }),
    getSettings(),
    props.searchParams,
  ]);
  return (
    <>
      <Link href="/admin/produits" className="text-sm text-muted hover:text-ink">← Produits</Link>
      <h1 className="font-display mt-2 text-3xl">Import en masse</h1>
      <p className="mt-1 mb-6 max-w-2xl text-sm text-muted">
        Étape 1 : importe les fiches (référence, nom, prix RMB, pointures…). Étape 2 : envoie toutes les photos d&apos;un coup,
        elles sont rangées automatiquement grâce à la référence dans le nom du fichier.
      </p>
      <ImportWizard
        initialStep={etape === "2" ? 2 : 1}
        settings={settings}
        products={products.map((p) => ({ id: p.id, ref: p.ref, name: p.name, images: p.images.length, active: p.active }))}
      />
    </>
  );
}
