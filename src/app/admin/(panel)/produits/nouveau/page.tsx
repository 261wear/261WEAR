import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { ProductForm } from "../ProductForm";

export default async function NewProductPage() {
  const settings = await getSettings();
  return (
    <>
      <Link href="/admin/produits" className="text-sm text-muted hover:text-ink">← Produits</Link>
      <h1 className="font-display mt-2 mb-6 text-3xl">Nouveau produit</h1>
      <ProductForm settings={settings} />
    </>
  );
}
