import { ProductGridSkeleton } from "@/components/Skeletons";
import { LoadingRegion, Skeleton } from "@/components/ui/Skeleton";

// Même forme que l'accueil : hero pastel (plaque photo, nom, prix, bouton), puis la grille de produits.
export default function Loading() {
  return (
    <LoadingRegion label="Chargement du drop…">
      <section className="bg-card">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pt-10 pb-12">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="mt-6 aspect-[4/3] w-full max-w-3xl rounded-[28px] md:aspect-[2.24/1]" />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-13 w-40 rounded-full" />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <Skeleton className="h-11 w-40" />
        <ProductGridSkeleton />
      </section>
    </LoadingRegion>
  );
}
