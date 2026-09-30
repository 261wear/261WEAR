import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-display text-7xl">404</p>
      <p className="mt-3 text-black/70">Cette page n&apos;existe pas ou ce modèle n&apos;est plus disponible.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/#drop" className="btn-dark">Voir le drop</Link>
        <Link href="/suivi" className="btn-ghost">Suivre ma commande</Link>
      </div>
    </div>
  );
}
