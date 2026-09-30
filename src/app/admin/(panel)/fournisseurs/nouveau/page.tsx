import Link from "next/link";
import { SupplierForm } from "../SupplierForm";

export default function NewSupplierPage() {
  return (
    <>
      <Link href="/admin/fournisseurs" className="text-sm text-muted hover:text-ink">← Fournisseurs</Link>
      <h1 className="font-display mt-2 mb-6 text-3xl">Nouveau fournisseur</h1>
      <SupplierForm />
    </>
  );
}
